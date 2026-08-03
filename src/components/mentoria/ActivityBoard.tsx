import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";
import {
  parseCount,
  useActivities,
  useExerciseResults,
  useLogResult,
  useSubjects,
  useTopics,
  type Activity,
  type ResultRow,
} from "@/lib/mentoria";
import { formatDateBR, pct, todayISO } from "@/lib/metrics";

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

/**
 * Card da atividade como o aluno vê.
 * `preview` deixa o card apenas visual (usado pelo professor em "Visualizar como aluno").
 */
export function ActivityCard({
  activity,
  userId,
  result,
  context,
  preview = false,
}: {
  activity: Activity;
  userId?: string;
  result?: ResultRow;
  context?: string;
  preview?: boolean;
}) {
  const logResult = useLogResult();
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const [error, setError] = useState<string | null>(null);
  const done = Boolean(result);

  return (
    <li className="rounded-2xl bg-muted/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{activity.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateBR(activity.due_date)}
            {context ? ` · ${context}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            done ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          {done ? "Concluído" : "Pendente"}
        </span>
      </div>

      {activity.exercise_url ? (
        <a
          href={activity.exercise_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abrir caderno
        </a>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Sem link cadastrado</p>
      )}

      {done && result ? (
        <p className="mt-3 text-xs font-semibold text-primary">
          {result.correct_count} ✅ · {result.wrong_count} ❌ ·{" "}
          {pct(result.correct_count, result.correct_count + result.wrong_count)}% de acerto
        </p>
      ) : (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (preview || !userId) return;
            const a = parseCount(acertos);
            const b = parseCount(erros);
            if (a === null || b === null) {
              setError("Informe apenas números inteiros maiores ou iguais a zero.");
              return;
            }
            if (a + b === 0) {
              setError("Registre ao menos uma questão resolvida.");
              return;
            }
            setError(null);
            logResult.mutate({
              user_id: userId,
              topic_id: activity.topic_id,
              activity_id: activity.id,
              correct_count: a,
              wrong_count: b,
              date: todayISO(),
            });
          }}
        >
          <input
            className={input}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            disabled={preview}
            placeholder="Quantidade de Acertos"
            value={acertos}
            onChange={(e) => setAcertos(e.target.value.replace(/[^\d]/g, ""))}
            aria-label={`Quantidade de Acertos em ${activity.title}`}
          />
          <input
            className={input}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            disabled={preview}
            placeholder="Quantidade de Erros"
            value={erros}
            onChange={(e) => setErros(e.target.value.replace(/[^\d]/g, ""))}
            aria-label={`Quantidade de Erros em ${activity.title}`}
          />
          <button
            disabled={logResult.isPending || preview}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {logResult.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Concluir
          </button>
          {(error || logResult.isError) && (
            <p className="text-xs text-destructive sm:col-span-3">
              {error ??
                (logResult.error instanceof Error
                  ? logResult.error.message
                  : "Não foi possível registrar.")}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

type Filter = "Pendentes" | "Concluídas" | "Todas";

/** Tela "Minhas Atividades": lista única e centralizada de tudo que o professor atribuiu. */
export function ActivityBoard({ userId }: { userId: string }) {
  const subjects = useSubjects();
  const topics = useTopics();
  const activities = useActivities();
  const results = useExerciseResults(userId);

  const [filter, setFilter] = useState<Filter>("Pendentes");

  const resultByActivity = useMemo(
    () =>
      new Map(
        (results.data ?? []).filter((r) => r.activity_id).map((r) => [r.activity_id as string, r]),
      ),
    [results.data],
  );

  const contextOf = useMemo(() => {
    const subjectTitle = new Map((subjects.data ?? []).map((s) => [s.id, s.title]));
    const map = new Map<string, string>();
    for (const t of topics.data ?? []) {
      const parent = (topics.data ?? []).find((p) => p.id === t.parent_topic_id);
      const trail = [subjectTitle.get(t.subject_id), parent?.title, t.title]
        .filter(Boolean)
        .join(" › ");
      map.set(t.id, trail);
    }
    return map;
  }, [subjects.data, topics.data]);

  const known = new Set((topics.data ?? []).map((t) => t.id));
  const all = (activities.data ?? []).filter((a) => known.has(a.topic_id));
  const list = all.filter((a) => {
    const done = resultByActivity.has(a.id);
    return filter === "Todas" || (filter === "Pendentes" ? !done : done);
  });

  const loading = activities.isLoading || topics.isLoading || results.isLoading;
  const pendentes = all.filter((a) => !resultByActivity.has(a.id)).length;

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-bold">Minhas Atividades</h2>
      <p className="text-xs text-muted-foreground">
        {pendentes} pendente{pendentes === 1 ? "" : "s"} · abra o caderno e registre seus acertos e
        erros
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["Pendentes", "Concluídas", "Todas"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              f === filter
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando atividades…
        </div>
      ) : list.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {filter === "Pendentes"
            ? "Nenhuma atividade pendente. Bom trabalho! 🎉"
            : "Nenhuma atividade nesta visão."}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {list.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              userId={userId}
              result={resultByActivity.get(a.id)}
              context={contextOf.get(a.topic_id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
