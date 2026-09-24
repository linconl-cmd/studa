import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, Loader2, Target, Trash2 } from "lucide-react";
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
  useExerciseResults,
  useStudents,
  useSubjects,
  useTopics,
  type SupportLink,
} from "@/lib/mentoria";
import { useRole, useSession } from "@/hooks/useSession";
import { formatDateBR, pct, todayISO } from "@/lib/metrics";
import { Dropdown, SupportLinksEditor, validLinks } from "@/components/mentoria/Pickers";

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

/** Planejamento Individual: o mentor escolhe um aluno (dropdown) e monta um plano exclusivo. */
export function StudentPlanning() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const students = useStudents(role === "mentor" ? user?.id : undefined);
  const subjects = useSubjects();
  const topics = useTopics();
  const activities = useActivities();
  const create = useCreateActivity();
  const del = useDeleteActivity();

  const alunos = (students.data ?? []).filter((s) => s.role === "student");
  const [studentId, setStudentId] = useState("");
  const current = studentId || alunos[0]?.id || "";
  const results = useExerciseResults(current || undefined);

  const [subjectId, setSubjectId] = useState("");
  const subj = subjectId || subjects.data?.[0]?.id || "";
  const subjTopics = (topics.data ?? []).filter((t) => t.subject_id === subj);
  const [topicId, setTopicId] = useState("");
  const topic = subjTopics.some((t) => t.id === topicId) ? topicId : subjTopics[0]?.id || "";

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [links, setLinks] = useState<SupportLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const topicTitle = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );
  const plan = (activities.data ?? [])
    .filter((a) => a.student_id === current)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const doneIds = new Set((results.data ?? []).map((r) => r.activity_id).filter(Boolean));
  const concluidas = plan.filter((a) => doneIds.has(a.id)).length;
  const progresso = pct(concluidas, plan.length);

  if (students.isLoading || subjects.isLoading || topics.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <Target className="h-5 w-5 text-primary" /> Planejamento Individual
        </h2>
        <p className="text-xs text-muted-foreground">
          Selecione um aluno e defina atividades exclusivas — elas aparecem em "Minhas Atividades"
          dele e contam no Ranking
        </p>

        {alunos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <Dropdown
                label="Aluno"
                value={current}
                onChange={setStudentId}
                options={alunos.map((a) => ({
                  value: a.id,
                  label: a.full_name?.trim() || a.email || "Aluno",
                }))}
              />
              <div className="min-w-48 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  Progresso do plano · {concluidas}/{plan.length} concluídas
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${progresso}%` }} />
                </div>
              </div>
            </div>

            <form
              className="mt-5 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!topic) return setError("Selecione um tópico.");
                if (!title.trim()) return setError("Informe o nome da atividade.");
                if (!validLinks(links))
                  return setError("Os links de apoio devem começar com http:// ou https://");
                setError(null);
                create.mutate(
                  {
                    topic_id: topic,
                    title: title.trim(),
                    exercise_url: topics.data?.find((t) => t.id === topic)?.exercise_url ?? null,
                    due_date: date,
                    student_id: current,
                    support_links: links,
                  },
                  {
                    onSuccess: () => {
                      setTitle("");
                      setLinks([]);
                    },
                    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao salvar."),
                  },
                );
              }}
            >
              <Dropdown
                label="Disciplina"
                value={subj}
                onChange={(v) => {
                  setSubjectId(v);
                  setTopicId("");
                }}
                options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.title }))}
              />
              <Dropdown
                label="Tópico"
                value={topic}
                onChange={setTopicId}
                options={subjTopics.map((t) => ({
                  value: t.id,
                  label: (t.parent_topic_id ? `${topicTitle.get(t.parent_topic_id)} › ` : "") + t.title,
                }))}
              />
              <input
                className={input}
                placeholder="Nome da atividade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Nome da atividade do plano"
              />
              <input
                className={input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Prazo de fechamento"
              />
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Conteúdo de apoio (apostilas e videoaulas)
                </p>
                <SupportLinksEditor links={links} onChange={setLinks} />
              </div>
              {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
              <button
                disabled={create.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
              >
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar ao plano
              </button>
            </form>

            <ul className="mt-5 space-y-2">
              {plan.length === 0 && (
                <li className="text-sm text-muted-foreground">Nenhuma atividade no plano deste aluno.</li>
              )}
              {plan.map((a) => {
                const done = doneIds.has(a.id);
                const late = !done && a.due_date < todayISO();
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {topicTitle.get(a.topic_id) ?? "Tópico"} ·{" "}
                        <span className={late ? "font-semibold text-destructive" : ""}>
                          <CalendarClock className="inline h-3 w-3" /> Prazo {formatDateBR(a.due_date)}
                        </span>
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          done ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        {done ? "Concluída" : "Pendente"}
                      </span>
                      <button
                        onClick={() => del.mutate(a.id)}
                        disabled={del.isPending}
                        aria-label="Excluir atividade do plano"
                        className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
