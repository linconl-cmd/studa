
CREATE TYPE public.app_role AS ENUM ('admin_mentor', 'student');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin_mentor'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_mentor'));

CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT '')
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _role public.app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (_uid, COALESCE(NULLIF(_full_name, ''), split_part(COALESCE(_email, ''), '@', 1)), _email)
  ON CONFLICT (id) DO UPDATE
    SET full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        email = COALESCE(public.profiles.email, EXCLUDED.email);

  SELECT role INTO _role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  IF _role IS NOT NULL THEN RETURN _role; END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin_mentor') THEN
    _role := 'student';
  ELSE
    _role := 'admin_mentor';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$$;
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects read" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects manage" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_mentor')) WITH CHECK (public.has_role(auth.uid(), 'admin_mentor'));

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics read" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "topics manage" ON public.topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_mentor')) WITH CHECK (public.has_role(auth.uid(), 'admin_mentor'));

CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  study_time_minutes integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions own read" ON public.study_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_mentor'));
CREATE POLICY "sessions own insert" ON public.study_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions own update" ON public.study_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions own delete" ON public.study_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  statement text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions mentor read" ON public.questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_mentor'));
CREATE POLICY "questions manage" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_mentor')) WITH CHECK (public.has_role(auth.uid(), 'admin_mentor'));

CREATE VIEW public.questions_public WITH (security_invoker = off) AS
  SELECT id, subject_id, topic_id, statement, options, created_at FROM public.questions;
GRANT SELECT ON public.questions_public TO authenticated;

CREATE TABLE public.student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  answered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_answers TO authenticated;
GRANT ALL ON public.student_answers TO service_role;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers own read" ON public.student_answers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_mentor'));
CREATE POLICY "answers own insert" ON public.student_answers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_answer(_question_id uuid, _selected_answer text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _correct boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (correct_answer = _selected_answer) INTO _correct FROM public.questions WHERE id = _question_id;
  IF _correct IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;
  INSERT INTO public.student_answers (user_id, question_id, selected_answer, is_correct)
  VALUES (_uid, _question_id, _selected_answer, _correct);
  RETURN _correct;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, text) TO authenticated;

INSERT INTO public.subjects (id, title, description) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Língua Portuguesa', 'Módulo inicial da mentoria');
INSERT INTO public.topics (subject_id, title) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Sintaxe'),
  ('11111111-1111-4111-8111-111111111111', 'Morfologia'),
  ('11111111-1111-4111-8111-111111111111', 'Interpretação de Texto'),
  ('11111111-1111-4111-8111-111111111111', 'Concordância Verbal'),
  ('11111111-1111-4111-8111-111111111111', 'Ortografia e Acentuação');
