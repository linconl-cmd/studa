
DROP VIEW IF EXISTS public.questions_public;

REVOKE SELECT ON public.questions FROM authenticated;
GRANT SELECT (id, subject_id, topic_id, statement, options, created_by, created_at)
  ON public.questions TO authenticated;

DROP POLICY IF EXISTS "questions mentor read" ON public.questions;
CREATE POLICY "questions read" ON public.questions FOR SELECT TO authenticated USING (true);

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
