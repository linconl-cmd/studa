import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { useBrandingValue } from "@/components/BrandProvider";
import { buildPartnerUrl, PARTNER_CTA, PARTNER_LABEL } from "@/lib/partner";

/**
 * Selo flutuante "Powered by" exibido em todas as telas (aluno, mentor e páginas públicas),
 * com link de indicação rastreável por UTM.
 */
export function PoweredByBadge() {
  const brand = useBrandingValue();
  const [minimized, setMinimized] = useState(false);
  const href = buildPartnerUrl(brand.platform_name);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMinimized(sessionStorage.getItem("poweredby:minimized") === "1");
  }, []);

  function minimize() {
    setMinimized(true);
    if (typeof window !== "undefined") sessionStorage.setItem("poweredby:minimized", "1");
  }

  if (minimized) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${PARTNER_LABEL} — ${PARTNER_CTA}`}
        className="fixed bottom-4 right-4 z-50 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg backdrop-blur transition-colors hover:bg-accent"
      >
        <Sparkles className="h-4 w-4" />
      </a>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-border/70 bg-card/90 py-1 pl-3 pr-1 shadow-lg backdrop-blur">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">
          {PARTNER_LABEL} <span className="hidden text-primary sm:inline">— {PARTNER_CTA}</span>
        </span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
      </a>
      <button
        type="button"
        onClick={minimize}
        aria-label="Minimizar selo"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Versão inline para rodapés de páginas. */
export function PoweredByFooter({ className = "" }: { className?: string }) {
  const brand = useBrandingValue();
  const href = buildPartnerUrl(brand.platform_name);

  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      {PARTNER_LABEL} —{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {PARTNER_CTA}
      </a>
    </p>
  );
}
