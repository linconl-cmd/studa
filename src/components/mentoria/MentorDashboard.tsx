import { useMemo, useState } from "react";
import { Users, Clock, CheckCircle2, XCircle, Plus, Loader2, Trash2, Link2 } from "lucide-react";
import {
  useCreateSubject,
  useCreateTopic,
  useDeleteSubject,
  useDeleteTopic,
  useExerciseResults,
  useStudents,
  useStudySessions,
  useSubjects,
  useTopics,
  useUpdateTopicUrl,
  useActivities,
  useCreateActivity,
  useDeleteActivity,
} from "@/lib/mentoria";
import { lastDays, pct, todayISO, formatDateBR } from "@/lib/metrics";
import { RankingScreen } from "@/components/mentoria/Ranking";
import { StudentDetail } from "@/components/mentoria/StudentDetail";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

export function MentorDashboard({ section = "Home" }: { section?: string }) {
  const showHome = section === "Home";
  const showStudents = section === "Meus Alunos";
  const showContent = section === "Gerenciador de Conteúdo";
  const showRanking = section === "Ranking";

  const students = useStudents();
  const sessions = useStudySessions();
  const results = useExerciseResults();
  const subjects = useSubjects();
  const topics = useTopics();

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const alunos = (students.data ?? []).filter((s) => s.role === "student");
  const days = lastDays(7);

  const totalMin = (sessions.data ?? []).reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = (results.data ?? []).reduce((a, r) => a + r.correct_count, 0);
  const err = (results.data ?? []).reduce((a, r) => a + r.wrong_count, 0);
  const ativos = new Set(
    (sessions.data ?? []).filter((s) => days.includes(s.date)).map((s) => s.user_id),
  ).size;

  const perStudent = alunos.map((a) => {
    const ss = (sessions.data ?? []).filter((s) => s.user_id === a.id);
    const rr = (results.data ?? []).filter((x) => x.user_id === a.id);
    const acertos = rr.reduce((t, r) => t + r.correct_count, 0);
    const erros = rr.reduce((t, r) => t + r.wrong_count, 0);
    return {
      id: a.id,
      nome: a.full_name?.trim() || "Aluno",
      minutos: ss.reduce((t, s) => t + s.study_time_minutes, 0),
      acertos,
      erros,
      pct: pct(acertos, acertos + erros),
    };
  });

  const rowsPorTopico = (topics.data ?? [])
    .filter((t) => t.subject_id === currentSubject)
    .map((t) => {
      const ss = (sessions.data ?? []).filter((s) => s.topic_id === t.id);
      const rr = (results.data ?? []).filter((r) => r.topic_id === t.id);
      const acertos = rr.reduce((x, r) => x + r.correct_count, 0);
      const erros = rr.reduce((x, r) => x + r.wrong_count, 0);
      return {
        id: t.id,
        t: t.title,
        minutos: ss.reduce((x, s) => x + s.study_time_minutes, 0),
        ok: acertos,
        err: erros,
        pct: pct(acertos, acertos + erros),
      };
    });

  if (showRanking) return <RankingScreen />;

  return (
    <div className="flex flex-col gap-5">
      {showHome && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <p className="font-display text-sm font-semibold text-muted-foreground">
              Total de Alunos
            </p>
            <div className="mt-4 flex items-end gap-3">
              <span className="font-display text-5xl font-bold leading-none">{alunos.length}</span>
              <span className="pb-1 text-xs text-muted-foreground">matriculados</span>
            </div>
            <div className="mt-6 rounded-2xl bg-secondary p-3">
              <div className="flex items-center gap-2 text-secondary-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold">Ativos nos últimos 7 dias</span>
              </div>
              <p className="mt-1 font-display text-2xl font-bold">{ativos}</p>
            </div>
          </Card>

          <Card>
            <p className="font-display text-sm font-semibold text-muted-foreground">
              Taxa Média de Acerto
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-5xl font-bold leading-none">
                {pct(ok, ok + err)}%
              </span>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${pct(ok, ok + err)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {ok} acertos · {err} erros em {ok + err} questões registradas
            </p>
          </Card>

          <Card>
            <p className="font-display text-sm font-semibold text-muted-foreground">
              Horas de Estudo Registradas
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-5xl font-bold leading-none">
                {Math.floor(totalMin / 60)}
              </span>
              <span className="pb-1 text-xs text-muted-foreground">h {totalMin % 60}min</span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Clock className="h-3.5 w-3.5" />
              {alunos.length ? Math.round(totalMin / alunos.length) : 0} min por aluno
            </p>
          </Card>
        </div>
      )}

      {(showHome || showStudents) && (
        <Card>
          <h2 className="font-display text-lg font-bold">Meus Alunos</h2>
          <p className="text-xs text-muted-foreground">
            Clique em um aluno para ver o detalhamento completo
          </p>
          <ul className="mt-4 space-y-2">
            {perStudent.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum aluno cadastrado ainda.</li>
            )}
            {perStudent.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected({ id: r.id, name: r.nome })}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3.5 text-left transition-colors hover:bg-secondary/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(r.minutos / 60)}h {r.minutos % 60}m · {r.acertos} ✅ · {r.erros}{" "}
                      ❌
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold">{r.pct}%</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(showHome || showStudents) && (
        <Card>
          <h2 className="font-display text-2xl font-bold">
            {subjects.data?.find((s) => s.id === currentSubject)?.title ?? "Matérias"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Desempenho por subtópico · todos os alunos
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
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

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 pb-1 font-semibold">Subtópico</th>
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
                {rowsPorTopico.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Cadastre tópicos para esta matéria no Gerenciador de Conteúdo.
                    </td>
                  </tr>
                )}
                {rowsPorTopico.map((r) => (
                  <tr key={r.id} className="bg-muted/60">
                    <td className="rounded-l-2xl px-4 py-3.5 font-semibold">{r.t}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {Math.floor(r.minutos / 60)}h {r.minutos % 60}m
                    </td>
                    <td className="px-4 py-3.5 font-medium text-success">{r.ok} ✅</td>
                    <td className="px-4 py-3.5 font-medium text-destructive">{r.err} ❌</td>
                    <td className="rounded-r-2xl px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-16 rounded-full bg-background">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="font-display font-bold">{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showContent && <ContentManager subjectId={currentSubject} />}
      {showContent && <TopicLinks subjectId={currentSubject} />}

      {selected && (
        <StudentDetail
          studentId={selected.id}
          studentName={selected.name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ContentManager({ subjectId }: { subjectId?: string }) {
  const subjects = useSubjects();
  const createSubject = useCreateSubject();
  const createTopic = useCreateTopic();

  const [subjectTitle, setSubjectTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicUrl, setTopicUrl] = useState("");
  const [topicSubject, setTopicSubject] = useState<string>("");

  const subjectOptions = subjects.data ?? [];

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Gerenciador de Conteúdo</h2>
      <p className="text-xs text-muted-foreground">
        Cadastre matérias e tópicos, e vincule o link do caderno de questões externo
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form
          className="rounded-2xl bg-muted/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!subjectTitle.trim()) return;
            createSubject.mutate(
              { title: subjectTitle.trim() },
              { onSuccess: () => setSubjectTitle("") },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Nova Matéria</p>
          <input
            className={`mt-3 ${input}`}
            placeholder="Ex: Matemática"
            value={subjectTitle}
            onChange={(e) => setSubjectTitle(e.target.value)}
          />
          <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {createSubject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar Matéria
          </button>
        </form>

        <form
          className="rounded-2xl bg-muted/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const sid = topicSubject || subjectId;
            if (!sid || !topicTitle.trim()) return;
            createTopic.mutate(
              {
                subject_id: sid,
                title: topicTitle.trim(),
                exercise_url: topicUrl.trim() || null,
              },
              {
                onSuccess: () => {
                  setTopicTitle("");
                  setTopicUrl("");
                },
              },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Novo Tópico</p>
          <select
            className={`mt-3 ${input}`}
            value={topicSubject || subjectId || ""}
            onChange={(e) => setTopicSubject(e.target.value)}
            aria-label="Matéria do tópico"
          >
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <input
            className={`mt-3 ${input}`}
            placeholder="Ex: Concordância Verbal"
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
          />
          <input
            className={`mt-3 ${input}`}
            type="url"
            placeholder="Link do caderno de questões (PDF, Forms, plataforma…)"
            value={topicUrl}
            onChange={(e) => setTopicUrl(e.target.value)}
          />
          <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {createTopic.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar Tópico
          </button>
        </form>
      </div>
    </Card>
  );
}

function TopicLinks({ subjectId }: { subjectId?: string }) {
  const subjects = useSubjects();
  const topics = useTopics();
  const updateUrl = useUpdateTopicUrl();
  const delSubject = useDeleteSubject();
  const delTopic = useDeleteTopic();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Não foi possível concluir a ação.");

  const myTopics = useMemo(
    () => (topics.data ?? []).filter((t) => t.subject_id === subjectId),
    [topics.data, subjectId],
  );

  return (
    <Card>
      <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
        <Link2 className="h-5 w-5 text-primary" /> Links de Questões por Tópico
      </h2>
      <p className="text-xs text-muted-foreground">
        O aluno abre o caderno externo e registra manualmente acertos e erros
      </p>

      {error && (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {myTopics.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhum tópico nesta matéria.</li>
        )}
        {myTopics.map((t) => (
          <li key={t.id} className="rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir o tópico "${t.title}"?`))
                    delTopic.mutate(t.id, { onError: fail, onSuccess: () => setError(null) });
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={input}
                type="url"
                placeholder="https://…"
                value={drafts[t.id] ?? t.exercise_url ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [t.id]: e.target.value }))}
                aria-label={`Link de questões de ${t.title}`}
              />
              <button
                onClick={() =>
                  updateUrl.mutate(
                    {
                      id: t.id,
                      exercise_url: (drafts[t.id] ?? t.exercise_url ?? "").trim() || null,
                    },
                    { onError: fail, onSuccess: () => setError(null) },
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Salvar link
              </button>
            </div>
            <TopicActivities topicId={t.id} topicTitle={t.title} defaultUrl={t.exercise_url} />
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-muted/50 p-4">
        <p className="font-display text-sm font-bold">Matérias cadastradas</p>
        <ul className="mt-3 space-y-2">
          {(subjects.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{s.title}</span>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir a matéria "${s.title}" e seus tópicos?`))
                    delSubject.mutate(s.id, { onError: fail, onSuccess: () => setError(null) });
                }}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </li>
          ))}
          {(subjects.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhuma matéria cadastrada.</li>
          )}
        </ul>
      </div>
    </Card>
  );
}

function TopicActivities({
  topicId,
  topicTitle,
  defaultUrl,
}: {
  topicId: string;
  topicTitle: string;
  defaultUrl: string | null;
}) {
  const activities = useActivities();
  const create = useCreateActivity();
  const del = useDeleteActivity();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState(todayISO());

  const mine = (activities.data ?? []).filter((a) => a.topic_id === topicId);

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Atividades ({mine.length}) — várias por dia são permitidas
      </p>
      <form
        className="mt-2 grid gap-2 sm:grid-cols-[1.2fr_1.4fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          create.mutate(
            {
              topic_id: topicId,
              title: title.trim(),
              exercise_url: url.trim() || defaultUrl,
              due_date: date,
            },
            {
              onSuccess: () => {
                setTitle("");
                setUrl("");
              },
            },
          );
        }}
      >
        <input
          className={input}
          placeholder="Nome da atividade"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={`Nome da atividade em ${topicTitle}`}
        />
        <input
          className={input}
          type="url"
          placeholder="Link do caderno (opcional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label={`Link da atividade em ${topicTitle}`}
        />
        <input
          className={input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={`Data da atividade em ${topicTitle}`}
        />
        <button className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Adicionar
        </button>
      </form>
      <ul className="mt-2 space-y-1">
        {mine.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate">
              {formatDateBR(a.due_date)} · {a.title}
            </span>
            <button
              onClick={() => del.mutate(a.id)}
              className="shrink-0 rounded-full border border-destructive/30 px-2 py-0.5 font-semibold text-destructive hover:bg-destructive/10"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
