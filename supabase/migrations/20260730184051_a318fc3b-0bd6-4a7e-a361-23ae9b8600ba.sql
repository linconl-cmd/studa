CREATE OR REPLACE FUNCTION public.ranking_overview(_topic_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  correct_count bigint,
  wrong_count bigint,
  accuracy numeric,
  study_minutes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  GROUP BY p.id, p.full_name
  ORDER BY 3 DESC, 5 DESC;
$$;

REVOKE ALL ON FUNCTION public.ranking_overview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ranking_overview(uuid) TO authenticated;