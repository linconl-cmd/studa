CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT ''::text, _invite_code text DEFAULT ''::text)
 RETURNS app_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _meta jsonb;
  _code text;
  _role public.app_role;
  _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email, raw_user_meta_data INTO _email, _meta FROM auth.users WHERE id = _uid;

  _name := btrim(COALESCE(NULLIF(btrim(_full_name), ''), NULLIF(btrim(_meta->>'full_name'), ''), NULLIF(btrim(_meta->>'name'), ''), ''));

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (_uid, _name, _email)
  ON CONFLICT (id) DO UPDATE
    SET full_name = CASE WHEN btrim(public.profiles.full_name) = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        email = COALESCE(public.profiles.email, EXCLUDED.email);

  SELECT role INTO _role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  IF _role IS NOT NULL THEN RETURN _role; END IF;

  _code := lower(btrim(COALESCE(NULLIF(_invite_code, ''), _meta->>'invite_code', '')));

  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    _role := 'super_admin';
  ELSIF _code = 'guerr4' THEN
    _role := 'mentor';
  ELSE
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$function$;