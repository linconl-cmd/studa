-- Remove the helper view (owner-privileged views trigger security lint)
DROP VIEW IF EXISTS public.questions_public;

-- Column-level protection: authenticated users can read questions, never correct_answer
DROP POLICY IF EXISTS "questions staff read" ON public.questions;

CREATE POLICY "questions read"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.questions FROM authenticated;
GRANT SELECT (id, subject_id, topic_id, statement, options, created_by, created_at)
  ON public.questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

-- Internal role-check helpers must not be callable through the API
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM authenticated;