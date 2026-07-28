import { FileText, Video, ListChecks, Upload, Plus, ArrowUpRight } from "lucide-react";

const acoes = [
  {
    icon: FileText,
    title: "PDF de Teoria",
    desc: "Envie apostilas e resumos em PDF",
    cta: "Fazer upload",
  },
  {
    icon: Video,
    title: "Videoaula",
    desc: "Adicione o link da aula gravada",
    cta: "Adicionar link",
  },
  {
    icon: ListChecks,
    title: "Banco de Questões",
    desc: "Crie questões para simulados e exercícios",
    cta: "Criar questão",
  },
];

const recentes = [
  { t: "Sintaxe — Período Composto (PDF)", tipo: "Teoria", data: "26 jul", qtd: "18 págs." },
  { t: "Aula 12 · Concordância Verbal", tipo: "Vídeo", data: "24 jul", qtd: "42 min" },
  { t: "Simulado ENEM · Linguagens 03", tipo: "Simulado", data: "22 jul", qtd: "45 questões" },
  { t: "Lista de Exercícios · Morfologia", tipo: "Exercícios", data: "20 jul", qtd: "30 questões" },
];

export function ContentStudio() {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold">Criação de Conteúdo</h2>
          <p className="text-xs text-muted-foreground">
            Publique teoria, videoaulas e questões para as turmas
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Upload className="h-4 w-4" /> Novo Conteúdo
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {acoes.map((a) => (
          <button
            key={a.title}
            className="group rounded-2xl border border-dashed border-border bg-muted/50 p-5 text-left transition-colors hover:border-primary hover:bg-secondary"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-card text-primary">
              <a.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-sm font-bold">{a.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <Plus className="h-3.5 w-3.5" /> {a.cta}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Publicados recentemente</h3>
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Gerenciar tudo <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {recentes.map((r) => (
            <li
              key={r.t}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.t}</p>
                <p className="text-xs text-muted-foreground">
                  {r.tipo} · {r.qtd}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
                {r.data}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
