ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS profiles_teacher_id_idx ON public.profiles(teacher_id);

-- helper: professor do usuário
CREATE OR REPLACE FUNCTION private.teacher_of(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT teacher_id FROM public.profiles WHERE id = _user_id
$$;

REVOKE ALL ON FUNCTION private.teacher_of(uuid) FROM PUBLIC;

-- lista pública de mentores (apenas id + nome) para o cadastro
CREATE OR REPLACE FUNCTION public.list_mentors()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role IN ('mentor','super_admin')
  ORDER BY p.full_name
$$;

GRANT EXECUTE ON FUNCTION public.list_mentors() TO anon, authenticated;

-- admin master define o professor de um aluno
CREATE OR REPLACE FUNCTION public.set_student_teacher(_student_id uuid, _teacher_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

REVOKE ALL ON FUNCTION public.set_student_teacher(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_teacher(uuid, uuid) TO authenticated;

-- bootstrap agora grava o professor escolhido
CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT ''::text, _invite_code text DEFAULT ''::text, _teacher_id uuid DEFAULT NULL)
RETURNS app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

-- ranking por turma
CREATE OR REPLACE FUNCTION public.ranking_overview(_topic_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, full_name text, correct_count bigint, wrong_count bigint, accuracy numeric, study_minutes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      OR (p.teacher_id IS NOT NULL AND p.teacher_id = private.teacher_of(auth.uid()))
    )
  GROUP BY p.id, p.full_name
  ORDER BY 3 DESC, 5 DESC;
$$;

-- RLS: mentores apenas dos alunos vinculados
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR teacher_id = auth.uid()
);

DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.teacher_of(user_id) = auth.uid()
);

DROP POLICY IF EXISTS "results own read" ON public.exercise_results;
CREATE POLICY "results own read" ON public.exercise_results FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.teacher_of(user_id) = auth.uid()
);

DROP POLICY IF EXISTS "sessions own read" ON public.study_sessions;
CREATE POLICY "sessions own read" ON public.study_sessions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.teacher_of(user_id) = auth.uid()
);