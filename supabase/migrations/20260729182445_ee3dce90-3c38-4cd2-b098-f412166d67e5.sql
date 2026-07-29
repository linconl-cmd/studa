REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;