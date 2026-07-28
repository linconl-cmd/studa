import { CalendarClock, Flag, Timer } from "lucide-react";

export function RightPanels() {
  return (
    <div className="flex w-full flex-col gap-5 xl:w-80 xl:shrink-0">
      <section className="rounded-3xl bg-card p-6 text-center shadow-soft">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <CalendarClock className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-display text-sm font-bold">Data da Prova</h3>
        <p className="mt-1 font-display text-3xl font-bold text-primary">18 out</p>
        <p className="text-xs text-muted-foreground">ENEM · 1º dia</p>
        <div className="mt-4 rounded-2xl bg-muted px-4 py-3">
          <p className="font-display text-2xl font-bold">82</p>
          <p className="text-xs text-muted-foreground">dias restantes</p>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold">Metas do Aluno</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {[
            { n: "Redações entregues", v: 6, t: 8 },
            { n: "Questões na semana", v: 240, t: 300 },
            { n: "Simulados no mês", v: 2, t: 3 },
          ].map((m) => (
            <li key={m.n}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{m.n}</span>
                <span className="font-semibold">
                  {m.v}/{m.t}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(m.v / m.t) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold">Estudo Semanal</h3>
        </div>
        <p className="mt-3 font-display text-3xl font-bold">21h 40m</p>
        <p className="text-xs text-muted-foreground">Meta: 25h por semana</p>
        <div className="mt-5 flex h-28 items-end gap-2">
          {[
            { d: "S", h: 55 },
            { d: "T", h: 78 },
            { d: "Q", h: 62 },
            { d: "Q", h: 90 },
            { d: "S", h: 48 },
            { d: "S", h: 70 },
            { d: "D", h: 30 },
          ].map((b, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end rounded-lg bg-muted">
                <div className="w-full rounded-lg bg-primary" style={{ height: `${b.h}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{b.d}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
