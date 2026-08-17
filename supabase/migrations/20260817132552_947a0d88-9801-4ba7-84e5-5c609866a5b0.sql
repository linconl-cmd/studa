-- 1) Private (non-exposed) implementations of the privileged routines
CREATE OR REPLACE FUNCTION private.bootstrap_current_user(_full_name text DEFAULT ''::text, _invite_code text DEFAULT ''::text, _teacher_id uuid DEFAULT NULL::uuid)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _meta jsonb;
  _code text;
  _role public.app_role;
  _name text;
  _teacher uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email, raw_user_meta_data INTO _email, _meta FROM auth.users WHERE id = _uid;

  _name := btrim(COALESCE(NULLIF(btrim(_full_name), ''), NULLIF(btrim(_meta->>'full_name'), ''), NULLIF(btrim(_meta->>'name'), ''), ''));
  _teacher := COALESCE(_teacher_id, NULLIF(btrim(COALESCE(_meta->>'teacher_id','')), '')::uuid);

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (_uid, _name, _email)
  ON CONFLICT (id) DO UPDATE
    SET full_name = CASE WHEN btrim(public.profiles.full_name) = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        email = COALESCE(public.profiles.email, EXCLUDED.email);

  SELECT role INTO _role FROM public.user_roles WHERE user_id = _uid LIMIT 1;

  IF _role IS NULL THEN
    _code := lower(btrim(COALESCE(NULLIF(_invite_code, ''), _meta->>'invite_code', '')));
    IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
      _role := 'super_admin';
    ELSIF _code = 'guerr4' THEN
      _role := 'mentor';
    ELSE
      _role := 'student';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF _role = 'student' AND _teacher IS NOT NULL AND _teacher <> _uid THEN
    UPDATE public.profiles SET teacher_id = _teacher
    WHERE id = _uid AND teacher_id IS DISTINCT FROM _teacher AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _teacher AND role IN ('mentor','super_admin')
    );
  END IF;

  RETURN _role;
END;
$function$;

CREATE OR REPLACE FUNCTION private.list_mentors()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'mentor'
  ORDER BY p.full_name
$function$;

CREATE OR REPLACE FUNCTION private.ranking_overview(_topic_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, full_name text, correct_count bigint, wrong_count bigint, accuracy numeric, study_minutes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.full_name,
    COALESCE(SUM(r.correct_count), 0)::bigint,
    COALESCE(SUM(r.wrong_count), 0)::bigint,
    CASE WHEN COALESCE(SUM(r.correct_count + r.wrong_count), 0) = 0 THEN 0
      ELSE ROUND(100.0 * SUM(r.correct_count) / SUM(r.correct_count + r.wrong_count), 0)
    END,
    COALESCE((
      SELECT SUM(s.study_time_minutes) FROM public.study_sessions s
      WHERE s.user_id = p.id AND (_topic_id IS NULL OR s.topic_id = _topic_id)
    ), 0)::bigint
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
  LEFT JOIN public.exercise_results r
    ON r.user_id = p.id AND (_topic_id IS NULL OR r.topic_id = _topic_id)
  WHERE auth.uid() IS NOT NULL
    AND (
      private.has_role(auth.uid(), 'super_admin')
      OR (private.has_role(auth.uid(), 'mentor') AND p.teacher_id = auth.uid())
      OR p.id = auth.uid()
      OR (
        private.has_role(auth.uid(), 'student')
        AND p.teacher_id IS NOT NULL
        AND p.teacher_id = private.teacher_of(auth.uid())
      )
    )
  GROUP BY p.id, p.full_name
  ORDER BY 3 DESC, 5 DESC;
$function$;

CREATE OR REPLACE FUNCTION private.set_mentor_branding_permission(_allowed boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o admin master pode alterar esta permissao';
  END IF;

  INSERT INTO public.branding_settings (id, allow_mentor_branding)
  VALUES ('default', _allowed)
  ON CONFLICT (id) DO UPDATE SET allow_mentor_branding = EXCLUDED.allow_mentor_branding;

  RETURN _allowed;
END;
$function$;

CREATE OR REPLACE FUNCTION private.set_student_teacher(_student_id uuid, _teacher_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_role(_uid, 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o admin master pode alterar vinculos';
  END IF;
  IF _teacher_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _teacher_id AND role IN ('mentor','super_admin')
  ) THEN
    RAISE EXCEPTION 'Professor invalido';
  END IF;
  IF _teacher_id = _student_id THEN RAISE EXCEPTION 'Vinculo invalido'; END IF;

  UPDATE public.profiles SET teacher_id = _teacher_id WHERE id = _student_id;
  RETURN _teacher_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.set_user_role(_user_id uuid, _role public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_role(_uid, 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o admin master pode alterar papeis';
  END IF;
  IF _user_id = _uid THEN
    RAISE EXCEPTION 'Voce nao pode alterar o proprio papel';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$function$;

REVOKE ALL ON FUNCTION private.bootstrap_current_user(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.list_mentors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ranking_overview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_mentor_branding_permission(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_student_teacher(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.bootstrap_current_user(text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_mentors() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.ranking_overview(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_mentor_branding_permission(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_student_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_user_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Public API routines become SECURITY INVOKER thin wrappers
DROP FUNCTION IF EXISTS public.bootstrap_current_user(text, text, uuid);
DROP FUNCTION IF EXISTS public.list_mentors();
DROP FUNCTION IF EXISTS public.ranking_overview(uuid);
DROP FUNCTION IF EXISTS public.set_mentor_branding_permission(boolean);
DROP FUNCTION IF EXISTS public.set_student_teacher(uuid, uuid);
DROP FUNCTION IF EXISTS public.set_user_role(uuid, public.app_role);

CREATE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT ''::text, _invite_code text DEFAULT ''::text, _teacher_id uuid DEFAULT NULL::uuid)
RETURNS public.app_role
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT private.bootstrap_current_user(_full_name, _invite_code, _teacher_id) $$;

CREATE FUNCTION public.list_mentors()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT * FROM private.list_mentors() $$;

CREATE FUNCTION public.ranking_overview(_topic_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, full_name text, correct_count bigint, wrong_count bigint, accuracy numeric, study_minutes bigint)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT * FROM private.ranking_overview(_topic_id) $$;

CREATE FUNCTION public.set_mentor_branding_permission(_allowed boolean)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT private.set_mentor_branding_permission(_allowed) $$;

CREATE FUNCTION public.set_student_teacher(_student_id uuid, _teacher_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT private.set_student_teacher(_student_id, _teacher_id) $$;

CREATE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
RETURNS public.app_role
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT private.set_user_role(_user_id, _role) $$;

REVOKE ALL ON FUNCTION public.bootstrap_current_user(text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ranking_overview(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_mentor_branding_permission(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_student_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_mentors() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_mentors() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranking_overview(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_mentor_branding_permission(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_student_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Branding: anonymous visitors only see the visual fields, via a safe view
DROP POLICY IF EXISTS "branding public read" ON public.branding_settings;
CREATE POLICY "branding authenticated read" ON public.branding_settings
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.branding_settings FROM anon;

CREATE OR REPLACE VIEW public.branding_public
WITH (security_invoker = off) AS
  SELECT id, platform_name, tagline, logo_url, primary_color
  FROM public.branding_settings
  WHERE id = 'default';

GRANT SELECT ON public.branding_public TO anon, authenticated, service_role;

-- 4) Users may create their own profile row only
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());