CREATE OR REPLACE FUNCTION public.list_mentors()
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'mentor'
  ORDER BY p.full_name
$function$;

REVOKE ALL ON FUNCTION public.list_mentors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_mentors() TO anon, authenticated;