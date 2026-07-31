-- Remove unused legacy overload
DROP FUNCTION IF EXISTS public.bootstrap_current_user(text, text);

-- Default-deny EXECUTE on SECURITY DEFINER functions, then grant narrowly
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_mentors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranking_overview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_student_teacher(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ranking_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_mentors() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;
