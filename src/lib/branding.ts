import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  platform_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
};

export const DEFAULT_BRANDING: Branding = {
  platform_name: "Guerreiros Mentoria",
  tagline: "Mentoria de Estudos",
  logo_url: null,
  primary_color: "#17A398",
};

export const PALETTES = [
  { label: "Verde-água", color: "#17A398" },
  { label: "Azul", color: "#2563EB" },
  { label: "Violeta", color: "#7C3AED" },
  { label: "Laranja", color: "#EA580C" },
  { label: "Rosa", color: "#DB2777" },
  { label: "Grafite", color: "#334155" },
];

/** Dados visuais da marca — visíveis publicamente (view sem campos de configuração). */
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    staleTime: 60_000,
    queryFn: async (): Promise<Branding> => {
      const { data, error } = await supabase
        .from("branding_public")
        .select("platform_name, tagline, logo_url, primary_color")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return (data as Branding | null) ?? DEFAULT_BRANDING;
    },
  });
}

/** Flag de permissão — restrita a usuários autenticados. */
export function useMentorBrandingAllowed(enabled = true) {
  return useQuery({
    queryKey: ["branding-permission"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("branding_settings")
        .select("allow_mentor_branding")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data?.allow_mentor_branding ?? false;
    },
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Omit<Branding, "allow_mentor_branding">>,
    ) => {
      const { error } = await supabase
        .from("branding_settings")
        .upsert({ id: "default", ...input })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding"] }),
  });
}

/** Admin Master decide se mentores podem editar a marca. */
export function useSetMentorBrandingPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allowed: boolean) => {
      const { error } = await supabase.rpc("set_mentor_branding_permission", {
        _allowed: allowed,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding"] }),
  });
}


/** Luminância relativa simples para escolher texto claro/escuro sobre a cor. */
export function readableForeground(hex: string) {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#101418" : "#ffffff";
}

export function applyBrandColor(color: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const fg = readableForeground(color);
  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--ring", color);
  root.style.setProperty("--accent", `color-mix(in srgb, ${color} 16%, var(--card))`);
  root.style.setProperty("--accent-foreground", color);
  root.style.setProperty("--secondary", `color-mix(in srgb, ${color} 10%, var(--card))`);
  root.style.setProperty("--secondary-foreground", color);
  root.style.setProperty("--sidebar-accent", `color-mix(in srgb, ${color} 16%, var(--sidebar))`);
  root.style.setProperty("--sidebar-accent-foreground", color);
}
