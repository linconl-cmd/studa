DROP VIEW IF EXISTS public.branding_public;

CREATE VIEW public.branding_public
WITH (security_invoker = on) AS
  SELECT id, platform_name, tagline, logo_url, primary_color
  FROM public.branding_settings
  WHERE id = 'default';

GRANT SELECT ON public.branding_public TO anon, authenticated, service_role;

CREATE POLICY "branding anon read" ON public.branding_settings
  FOR SELECT TO anon USING (true);

GRANT SELECT (id, platform_name, tagline, logo_url, primary_color)
  ON public.branding_settings TO anon;