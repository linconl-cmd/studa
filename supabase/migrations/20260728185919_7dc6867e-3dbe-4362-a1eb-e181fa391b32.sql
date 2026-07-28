REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_current_user(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_answer(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;