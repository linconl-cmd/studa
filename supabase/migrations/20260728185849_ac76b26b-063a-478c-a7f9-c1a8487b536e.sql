-- 1. New role enum
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'mentor', 'student');

-- 2. Drop dependent policies
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "questions manage" ON public.questions;
DROP POLICY IF EXISTS "answers own read" ON public.student_answers;
DROP POLICY IF EXISTS "sessions own read" ON public.study_sessions;
DROP POLICY IF EXISTS "subjects manage" ON public.subjects;
DROP POLICY IF EXISTS "topics manage" ON public.topics;
DROP POLICY IF EXISTS "own roles read" ON public.user_roles;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role_old);
DROP FUNCTION IF EXISTS public.bootstrap_current_user(text);

-- 3. Migrate column
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING (CASE WHEN role::text = 'admin_mentor' THEN 'super_admin' ELSE 'student' END)::public.app_role;

DROP TYPE public.app_role_old;

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'mentor')
  );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT '', _invite_code text DEFAULT '')
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

  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    _role := 'super_admin';
  ELSIF COALESCE(_invite_code, '') = 'guerr4' THEN
    _role := 'mentor';
  ELSE
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$$;

-- 5. Recreate policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "super admin delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "questions manage" ON public.questions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "answers own read" ON public.student_answers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "sessions own read" ON public.study_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "subjects manage" ON public.subjects FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "topics manage" ON public.topics FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "super admin delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));