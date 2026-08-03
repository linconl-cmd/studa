-- helper: is the viewer a mentor that owns this student?
CREATE OR REPLACE FUNCTION private.owns_student(_viewer uuid, _student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT _viewer IS NOT NULL
     AND _student IS NOT NULL
     AND private.has_role(_viewer, 'mentor')
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = _student AND p.teacher_id = _viewer
     );
$$;

REVOKE ALL ON FUNCTION private.owns_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.owns_student(uuid, uuid) TO authenticated, service_role;

-- profiles
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.owns_student(auth.uid(), id)
);

-- user_roles
DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.owns_student(auth.uid(), user_id)
);

-- study_sessions
DROP POLICY IF EXISTS "sessions own read" ON public.study_sessions;
CREATE POLICY "sessions own read" ON public.study_sessions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.owns_student(auth.uid(), user_id)
);

-- exercise_results
DROP POLICY IF EXISTS "results own read" ON public.exercise_results;
CREATE POLICY "results own read" ON public.exercise_results
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin')
  OR private.owns_student(auth.uid(), user_id)
);

-- ranking: super_admin vê todos; mentor só os seus; aluno só colegas do mesmo professor
CREATE OR REPLACE FUNCTION public.ranking_overview(_topic_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, full_name text, correct_count bigint, wrong_count bigint, accuracy numeric, study_minutes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (
      private.has_role(auth.uid(), 'super_admin')
      OR (private.has_role(auth.uid(), 'mentor') AND p.teacher_id = auth.uid())
      OR p.id = auth.uid()
      OR (
        private.has_role(auth.uid(), 'student')
        AND p.teacher_id IS NOT NULL
        AND p.teacher_id = private.teacher_of(auth.uid())
      )
    )
  GROUP BY p.id, p.full_name
  ORDER BY 3 DESC, 5 DESC;
$function$;

REVOKE ALL ON FUNCTION public.ranking_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ranking_overview(uuid) TO authenticated;