ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS parent_topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS topics_parent_topic_id_idx ON public.topics(parent_topic_id);