import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import {
  applyBrandColor,
  PALETTES,
  useBranding,
  useSetMentorBrandingPermission,
  useUpdateBranding,
} from "@/lib/branding";

export function BrandSettings({
  isSuperAdmin = false,
  canEdit = true,
}: {
  isSuperAdmin?: boolean;
  canEdit?: boolean;
}) {
  const branding = useBranding();
  const update = useUpdateBranding();
  const setPermission = useSetMentorBrandingPermission();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [color, setColor] = useState("#17A398");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branding.data) return;
    setName(branding.data.platform_name);
    setTagline(branding.data.tagline);
    setLogoUrl(branding.data.logo_url ?? "");
    setColor(branding.data.primary_color);
  }, [branding.data]);

  const input =
    "w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary";

  function preview(next: string) {
    setColor(next);
    applyBrandColor(next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        platform_name: name.trim() || "Guerreiros Mentoria",
        tagline: tagline.trim(),
        logo_url: logoUrl.trim() || null,
        primary_color: color,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  if (branding.isLoading) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const allowMentor = mentorAllowed.data ?? false;

  return (
    <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Identidade da marca</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize nome, logotipo e cores — a plataforma inteira reflete essas escolhas.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">
            Nome da plataforma / mentor
            <input
              className={`${input} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            Subtítulo
            <input
              className={`${input} mt-1`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              disabled={!canEdit}
              placeholder="Mentoria de Estudos"
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            URL do logotipo
            <input
              className={`${input} mt-1`}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!canEdit}
              placeholder="https://..."
            />
          </label>
        </div>

        <h3 className="mt-6 font-display text-sm font-bold">Cor primária</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.color}
              type="button"
              onClick={() => preview(p.color)}
              disabled={!canEdit}
              title={p.label}
              aria-label={p.label}
              className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-transform hover:scale-105 ${
                color.toLowerCase() === p.color.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: p.color }}
            >
              {color.toLowerCase() === p.color.toLowerCase() && (
                <Check className="h-4 w-4 text-white" />
              )}
            </button>
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => preview(e.target.value)}
            disabled={!canEdit}
            aria-label="Cor personalizada"
            className="h-9 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
          />
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {saved && <p className="mt-4 text-sm text-success">Marca atualizada com sucesso.</p>}

        {!canEdit && (
          <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Somente o Admin Master pode editar a marca. Solicite a liberação para personalizar a
            plataforma.
          </p>
        )}

        <button
          disabled={update.isPending || !canEdit}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar marca
        </button>
      </section>

      <div className="grid gap-4">
      {isSuperAdmin && (
        <section className="rounded-3xl bg-card p-6 shadow-soft">
          <h3 className="font-display text-sm font-bold">Permissão dos mentores</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Defina se os mentores podem alterar nome, logotipo e cores da plataforma.
          </p>
          <button
            type="button"
            disabled={setPermission.isPending}
            onClick={() => setPermission.mutate(!allowMentor)}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            <span>Mentores podem editar a marca</span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${
                allowMentor ? "bg-primary" : "bg-muted"
              }`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${
                  allowMentor ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
          {setPermission.isError && (
            <p className="mt-3 text-sm text-destructive">Não foi possível alterar a permissão.</p>
          )}
        </section>
      )}

      <aside className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold text-muted-foreground">Pré-visualização</p>
        <div className="mt-4 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logotipo" className="h-11 w-11 rounded-2xl object-cover" />
          ) : (
            <div className="h-11 w-11 rounded-2xl" style={{ backgroundColor: color }} aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold">{name || "Sua marca"}</p>
            <p className="truncate text-xs text-muted-foreground">{tagline}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
            Botão primário
          </div>
          <div className="rounded-xl bg-sidebar-accent px-4 py-2.5 text-center text-sm font-semibold text-sidebar-accent-foreground">
            Item ativo do menu
          </div>
        </div>
      </aside>
      </div>
    </form>
  );
}
