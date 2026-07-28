import { useState } from "react";
import {
  Users,
  UserCheck,
  Target,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Settings2,
} from "lucide-react";


function Gauge({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-[135deg]">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(arc * value) / 100} ${c}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-3xl font-bold">{value}%</p>
        <p className="text-xs text-muted-foreground">média geral</p>
      </div>
    </div>
  );
}

export function KpiCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="font-display text-sm font-semibold text-muted-foreground">Total de Alunos</p>
        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-5xl font-bold leading-none">128</span>
          <span className="pb-1 text-xs text-muted-foreground">matriculados</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary p-3">
            <div className="flex items-center gap-2 text-secondary-foreground">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs font-semibold">Ativos</span>
            </div>
            <p className="mt-1 font-display text-2xl font-bold">96</p>
          </div>
          <div className="rounded-2xl bg-muted p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold">Inativos</span>
            </div>
            <p className="mt-1 font-display text-2xl font-bold">32</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center rounded-3xl bg-card p-6 text-center shadow-soft">
        <p className="font-display text-sm font-semibold text-muted-foreground">
          Progresso Médio das Matérias
        </p>
        <div className="mt-2">
          <Gauge value={68} />
        </div>
        <div className="mt-2 w-full space-y-2 text-left">
          {[
            { n: "Língua Portuguesa", v: 74 },
            { n: "Matemática", v: 61 },
          ].map((s) => (
            <div key={s.n}>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{s.n}</span>
                <span>{s.v}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${s.v}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="font-display text-sm font-semibold text-muted-foreground">
          Média em Simulados
        </p>
        <div className="mt-4 flex items-end gap-2">
          <span className="font-display text-5xl font-bold leading-none">7,4</span>
          <span className="pb-1 text-xs text-muted-foreground">/ 10</span>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          <Target className="h-3.5 w-3.5" /> +0,6 vs. último simulado
        </p>
        <div className="mt-6 flex h-24 items-end gap-2">
          {[52, 61, 58, 70, 66, 74, 71].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-lg bg-accent" style={{ height: `${h}%` }}>
              <div
                className="h-full w-full rounded-t-lg bg-primary/70"
                style={{ opacity: i === 6 ? 1 : 0.35 }}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Últimos 7 simulados aplicados</p>
      </div>
    </div>
  );
}

const attendance = Array.from({ length: 35 }, (_, i) => {
  const seed = (i * 7) % 11;
  if (i > 30) return "empty";
  return seed > 8 ? "miss" : "ok";
});

export function Assiduidade() {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold">
            Engajamento Semanal dos Alunos
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas 5 semanas · 96 de 128 alunos estudaram hoje
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Estudou
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Sem atividade
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-3">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-center text-[11px] font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
        {attendance.map((s, i) => (
          <div key={i} className="grid place-items-center">
            <span
              className={`h-6 w-6 rounded-full sm:h-7 sm:w-7 ${
                s === "ok" ? "bg-success" : s === "miss" ? "bg-destructive" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

type Row = { t: string; time: string; ok: number; err: number; origem: string };

const materias: Record<string, { desc: string; rows: Row[] }> = {
  "Língua Portuguesa": {
    desc: "Desempenho por subtópico · 128 alunos · 6 simulados aplicados",
    rows: [
      { t: "Sintaxe", time: "12h 30m", ok: 184, err: 42, origem: "Simulado ENEM 03" },
      { t: "Morfologia", time: "9h 15m", ok: 141, err: 58, origem: "Lista de Exercícios 07" },
      {
        t: "Interpretação de Texto",
        time: "15h 05m",
        ok: 226,
        err: 39,
        origem: "Simulado Linguagens 02",
      },
      { t: "Ortografia e Acentuação", time: "6h 40m", ok: 98, err: 21, origem: "Exercícios 04" },
      { t: "Concordância Verbal", time: "8h 20m", ok: 112, err: 66, origem: "Simulado ENEM 03" },
    ],
  },
  Redação: {
    desc: "Desempenho por competência · 128 alunos · 4 propostas corrigidas",
    rows: [
      { t: "Competência 1 — Norma culta", time: "4h 10m", ok: 88, err: 24, origem: "Proposta 04" },
      { t: "Competência 3 — Argumentação", time: "5h 45m", ok: 74, err: 46, origem: "Proposta 03" },
      { t: "Competência 5 — Intervenção", time: "3h 30m", ok: 61, err: 52, origem: "Proposta 04" },
    ],
  },
  Matemática: {
    desc: "Módulo em preparação · dados dos primeiros exercícios",
    rows: [
      { t: "Razão e Proporção", time: "5h 20m", ok: 96, err: 48, origem: "Exercícios 01" },
      { t: "Funções", time: "4h 05m", ok: 71, err: 59, origem: "Exercícios 02" },
    ],
  },
};

export function MateriaPanel() {
  const nomes = Object.keys(materias);
  const [atual, setAtual] = useState(nomes[0]);
  const { desc, rows } = materias[atual];

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold">{atual}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Settings2 className="h-4 w-4" /> Gerenciar Matérias
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {nomes.map((n) => (
          <button
            key={n}
            onClick={() => setAtual(n)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              n === atual
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {n}
          </button>
        ))}
        <button className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold text-primary">
          <Plus className="h-4 w-4" /> Adicionar Matéria
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 pb-1 font-semibold">Subtópico</th>
              <th className="px-4 pb-1 font-semibold">Origem</th>
              <th className="px-4 pb-1 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Tempo
                </span>
              </th>
              <th className="px-4 pb-1 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Acertadas
                </span>
              </th>
              <th className="px-4 pb-1 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Erradas
                </span>
              </th>
              <th className="px-4 pb-1 font-semibold">% Acerto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = Math.round((r.ok / (r.ok + r.err)) * 100);
              return (
                <tr key={r.t} className="bg-muted/60">
                  <td className="rounded-l-2xl px-4 py-3.5 font-semibold">{r.t}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{r.origem}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{r.time}</td>
                  <td className="px-4 py-3.5 font-medium text-success">{r.ok} ✅</td>
                  <td className="px-4 py-3.5 font-medium text-destructive">{r.err} ❌</td>
                  <td className="rounded-r-2xl px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 rounded-full bg-background">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-display font-bold">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

