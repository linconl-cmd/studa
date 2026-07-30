import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";
import {
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

function ActivityCard({
  activity,
  userId,
  result,
}: {
  activity: Activity;
  userId: string;
  result?: ResultRow;
}) {
  const logResult = useLogResult();
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const done = Boolean(result);

  return (
    <li className="rounded-2xl bg-muted/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{activity.title}</p>
          <p className="text-xs text-muted-foreground">{formatDateBR(activity.due_date)}</p>
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
            const a = parseInt(acertos || "0", 10);
            const b = parseInt(erros || "0", 10);
            if (a < 0 || b < 0 || a + b === 0) return;
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
            placeholder="Quantidade de Acertos"
            value={acertos}
            onChange={(e) => setAcertos(e.target.value)}
            aria-label={`Quantidade de Acertos em ${activity.title}`}
          />
          <input
            className={input}
            type="number"
            min={0}
            placeholder="Quantidade de Erros"
            value={erros}
            onChange={(e) => setErros(e.target.value)}
            aria-label={`Quantidade de Erros em ${activity.title}`}
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {logResult.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Concluir
          </button>
        </form>
      )}
    </li>
  );
}

export function ActivityBoard({ userId }: { userId: string }) {
  const subjects = useSubjects();
  const topics = useTopics();
  const activities = useActivities();
  const results = useExerciseResults(userId);

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;
  const myTopics = (topics.data ?? []).filter((t) => t.subject_id === currentSubject);

  const resultByActivity = useMemo(
    () =>
      new Map(
        (results.data ?? []).filter((r) => r.activity_id).map((r) => [r.activity_id as string, r]),
      ),
    [results.data],
  );

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        {(subjects.data ?? []).map((s) => (
          <button
            key={s.id}
            onClick={() => setSubjectId(s.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              s.id === currentSubject
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <h2 className="mt-5 font-display text-lg font-bold">Atividades por Tópico</h2>
      <p className="text-xs text-muted-foreground">
        Cada tópico pode ter várias atividades no mesmo dia — abra o caderno e registre acertos e
        erros de cada uma
      </p>

      <div className="mt-5 space-y-5">
        {myTopics.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum tópico disponível ainda.</p>
        )}
        {myTopics.map((t) => {
          const acts = (activities.data ?? []).filter((a) => a.topic_id === t.id);
          const byDate = new Map<string, Activity[]>();
          for (const a of acts) {
            const list = byDate.get(a.due_date) ?? [];
            list.push(a);
            byDate.set(a.due_date, list);
          }
          return (
            <div key={t.id} className="rounded-2xl border border-border/60 p-4">
              <p className="font-display text-sm font-bold">{t.title}</p>
              {acts.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhuma atividade cadastrada pelo mentor.
                </p>
              ) : (
                [...byDate.entries()].map(([date, list]) => (
                  <div key={date} className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatDateBR(date)} · {list.length}{" "}
                      {list.length === 1 ? "atividade" : "atividades"}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {list.map((a) => (
                        <ActivityCard
                          key={a.id}
                          activity={a}
                          userId={userId}
                          result={resultByActivity.get(a.id)}
                        />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
