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
