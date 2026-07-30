export function pct(ok: number, total: number) {
  if (!total) return 0;
  return Math.round((ok / total) * 100);
}

/** Últimos N dias em formato YYYY-MM-DD (ordem cronológica). */
export function lastDays(n: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Formata data (Date ou "YYYY-MM-DD"/ISO) como dd/mm/yy. */
export function formatDateBR(value: string | Date | null | undefined) {
  if (!value) return "—";
  let d: Date;
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  } else {
    d = value;
  }
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
