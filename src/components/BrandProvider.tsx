import { useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { applyBrandColor, DEFAULT_BRANDING, useBranding } from "@/lib/branding";

/** Aplica a cor primária personalizada em toda a aplicação. */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const branding = useBranding();
  const color = branding.data?.primary_color;

  useEffect(() => {
    if (color) applyBrandColor(color);
  }, [color]);

  return <>{children}</>;
}

export function useBrandingValue() {
  const { data } = useBranding();
  return data ?? DEFAULT_BRANDING;
}

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const brand = useBrandingValue();
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";

  return (
    <div className="flex min-w-0 items-center gap-3">
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={`Logotipo ${brand.platform_name}`}
          className={`${box} shrink-0 object-cover`}
        />
      ) : (
        <div
          className={`${box} grid shrink-0 place-items-center bg-primary text-primary-foreground`}
        >
          <GraduationCap className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold leading-tight">
          {brand.platform_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{brand.tagline}</p>
      </div>
    </div>
  );
}
