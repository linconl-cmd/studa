CREATE TABLE public.branding_settings (
  id text PRIMARY KEY DEFAULT 'default',
  platform_name text NOT NULL DEFAULT 'Guerreiros Mentoria',
  tagline text NOT NULL DEFAULT 'Mentoria de Estudos',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#17A398',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branding_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.branding_settings TO authenticated;
GRANT ALL ON public.branding_settings TO service_role;

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branding public read" ON public.branding_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "branding staff insert" ON public.branding_settings FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "branding staff update" ON public.branding_settings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.branding_settings (id) VALUES ('default');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;