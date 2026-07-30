-- 1) Restrict direct reads of questions (which contain correct_answer) to staff only
DROP POLICY IF EXISTS "questions read" ON public.questions;

CREATE POLICY "questions staff read"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2) Safe projection for students: no correct_answer exposed
CREATE OR REPLACE VIEW public.questions_public
WITH (security_invoker = false) AS
  SELECT id, subject_id, topic_id, statement, options, created_at
  FROM public.questions;

GRANT SELECT ON public.questions_public TO authenticated;
REVOKE ALL ON public.questions_public FROM anon;

-- 3) Reduce reachability of SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_answer(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;