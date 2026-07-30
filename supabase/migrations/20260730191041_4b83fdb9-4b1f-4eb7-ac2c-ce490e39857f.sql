CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  exercise_url text,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities manage" ON public.activities FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.exercise_results
  ADD COLUMN activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL;

CREATE INDEX idx_activities_topic ON public.activities(topic_id, due_date);
CREATE INDEX idx_exercise_results_activity ON public.exercise_results(activity_id);