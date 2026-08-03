ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS allow_mentor_branding boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.mentor_branding_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE((SELECT allow_mentor_branding FROM public.branding_settings WHERE id = 'default'), false)
$$;

REVOKE ALL ON FUNCTION private.mentor_branding_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.mentor_branding_allowed() TO authenticated, service_role;

DROP POLICY IF EXISTS "branding staff insert" ON public.branding_settings;
DROP POLICY IF EXISTS "branding staff update" ON public.branding_settings;

CREATE POLICY "branding write insert" ON public.branding_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'super_admin')
    OR (private.has_role(auth.uid(), 'mentor') AND private.mentor_branding_allowed())
  );

CREATE POLICY "branding write update" ON public.branding_settings
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'super_admin')
    OR (private.has_role(auth.uid(), 'mentor') AND private.mentor_branding_allowed())
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'super_admin')
    OR (private.has_role(auth.uid(), 'mentor') AND private.mentor_branding_allowed())
  );

CREATE OR REPLACE FUNCTION public.set_mentor_branding_permission(_allowed boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o admin master pode alterar esta permissao';
  END IF;

  INSERT INTO public.branding_settings (id, allow_mentor_branding)
  VALUES ('default', _allowed)
  ON CONFLICT (id) DO UPDATE SET allow_mentor_branding = EXCLUDED.allow_mentor_branding;

  RETURN _allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.set_mentor_branding_permission(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_mentor_branding_permission(boolean) TO authenticated, service_role;