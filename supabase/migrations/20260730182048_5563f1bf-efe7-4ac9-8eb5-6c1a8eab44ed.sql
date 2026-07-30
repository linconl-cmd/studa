CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'mentor')
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

-- Recreate policies against the private helpers
DROP POLICY "sessions own read" ON public.study_sessions;
CREATE POLICY "sessions own read" ON public.study_sessions FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY "super admin delete profile" ON public.profiles;
CREATE POLICY "super admin delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'));

DROP POLICY "questions manage" ON public.questions;
CREATE POLICY "questions manage" ON public.questions FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "answers own read" ON public.student_answers;
CREATE POLICY "answers own read" ON public.student_answers FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY "subjects manage" ON public.subjects;
CREATE POLICY "subjects manage" ON public.subjects FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "topics manage" ON public.topics;
CREATE POLICY "topics manage" ON public.topics FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY "super admin delete roles" ON public.user_roles;
CREATE POLICY "super admin delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'));

DROP POLICY "branding staff insert" ON public.branding_settings;
CREATE POLICY "branding staff insert" ON public.branding_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "branding staff update" ON public.branding_settings;
CREATE POLICY "branding staff update" ON public.branding_settings FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- set_user_role now uses the private helper
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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

DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);