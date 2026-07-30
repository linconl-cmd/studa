export function pct(ok: number, total: number) {
  if (!total) return 0;
  return Math.round((ok / total) * 100);
}

/** Converte um Date para YYYY-MM-DD usando o fuso local (sem shift de UTC). */
function toLocalISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Últimos N dias em formato YYYY-MM-DD (ordem cronológica, fuso local). */
export function lastDays(n: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push(toLocalISO(d));
  }
  return out;
}

export function todayISO() {
  return toLocalISO(new Date());
}

/** Índice do dia da semana (0 = domingo) de uma data "YYYY-MM-DD". */
export function weekdayIndex(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
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
