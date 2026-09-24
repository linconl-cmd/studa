ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS support_links jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS activities_student_id_idx ON public.activities(student_id);
DROP POLICY IF EXISTS "activities read" ON public.activities;
CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated
USING (
  student_id IS NULL
  OR student_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin'::app_role)
  OR private.owns_student(auth.uid(), student_id)
);