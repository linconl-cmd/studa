CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o admin master pode alterar papeis';
  END IF;
  IF _user_id = _uid THEN
    RAISE EXCEPTION 'Voce nao pode alterar o proprio papel';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;