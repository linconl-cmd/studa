import { BookOpen, PlayCircle, Plus, X } from "lucide-react";
import type { SupportLink } from "@/lib/mentoria";

export const selectCls =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary sm:w-72";

/** Menu dropdown genérico (substitui abas/pop-ups). */
export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none focus:border-primary";

/** Editor de links de apoio (apostilas e videoaulas) de uma atividade. */
export function SupportLinksEditor({
  links,
  onChange,
}: {
  links: SupportLink[];
  onChange: (l: SupportLink[]) => void;
}) {
  const update = (i: number, patch: Partial<SupportLink>) =>
    onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="flex flex-col gap-2">
      {links.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[130px_1fr_1.5fr_auto]">
          <select
            className={inputCls}
            value={l.kind}
            onChange={(e) => update(i, { kind: e.target.value as SupportLink["kind"] })}
            aria-label="Tipo de material"
          >
            <option value="apostila">Apostila</option>
            <option value="video">Videoaula</option>
          </select>
          <input
            className={inputCls}
            placeholder="Título (opcional)"
            value={l.label ?? ""}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className={inputCls}
            type="url"
            placeholder="https://…"
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            aria-label="Link do material de apoio"
          />
          <button
            type="button"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            aria-label="Remover material"
            className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...links, { kind: "apostila", url: "" }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" /> <BookOpen className="h-3.5 w-3.5" /> Apostila
        </button>
        <button
          type="button"
          onClick={() => onChange([...links, { kind: "video", url: "" }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" /> <PlayCircle className="h-3.5 w-3.5" /> Videoaula
        </button>
      </div>
    </div>
  );
}

export function validLinks(links: SupportLink[]) {
  return links.every((l) => !l.url.trim() || /^https?:\/\//i.test(l.url.trim()));
}
