ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS exercise_url text;

CREATE TABLE public.exercise_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_results TO authenticated;
GRANT ALL ON public.exercise_results TO service_role;

ALTER TABLE public.exercise_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results own read" ON public.exercise_results FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));
CREATE POLICY "results own insert" ON public.exercise_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "results own update" ON public.exercise_results FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "results own delete" ON public.exercise_results FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_exercise_results_updated_at
  BEFORE UPDATE ON public.exercise_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.submit_answer(uuid, text);
DROP TABLE IF EXISTS public.student_answers;
DROP TABLE IF EXISTS public.questions;