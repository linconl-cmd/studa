import { useMemo, useState } from "react";
import { Users, Clock, CheckCircle2, XCircle, Plus, Loader2 } from "lucide-react";
import {
  useAllQuestionsMeta,
  useAnswers,
  useCreateQuestion,
  useCreateSubject,
  useCreateTopic,
  useStudents,
  useStudySessions,
  useSubjects,
  useTopics,
} from "@/lib/mentoria";
import { lastDays, pct } from "@/lib/metrics";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

export function MentorDashboard({ section = "Home" }: { section?: string }) {
  const showHome = section === "Home";
  const showStudents = section === "Meus Alunos";
  const showContent = section === "Gerenciador de Conteúdo";
  const showQuiz = section === "Criação de Simulados";
  const showProgress = section === "Análise de Progresso";

  const students = useStudents();
  const sessions = useStudySessions();
  const answers = useAnswers();
  const subjects = useSubjects();
  const topics = useTopics();
  const qMeta = useAllQuestionsMeta();

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;

  const alunos = (students.data ?? []).filter((s) => s.role === "student");
  const topicById = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t])),
    [topics.data],
  );
  const questionTopic = useMemo(
    () => new Map((qMeta.data ?? []).map((q) => [q.id, q])),
    [qMeta.data],
  );

  const days = lastDays(35);
  const studiedDays = new Set((sessions.data ?? []).map((s) => s.date));

  const totalMin = (sessions.data ?? []).reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = (answers.data ?? []).filter((a) => a.is_correct).length;
  const err = (answers.data ?? []).length - ok;
  const ativos = new Set(
    (sessions.data ?? [])
      .filter((s) => days.slice(-7).includes(s.date))
      .map((s) => s.user_id),
  ).size;

  const perStudent = alunos.map((a) => {
    const ss = (sessions.data ?? []).filter((s) => s.user_id === a.id);
    const ans = (answers.data ?? []).filter((x) => x.user_id === a.id);
    const acertos = ans.filter((x) => x.is_correct).length;
    return {
      id: a.id,
      nome: a.full_name || a.email || "Aluno",
      minutos: ss.reduce((t, s) => t + s.study_time_minutes, 0),
      acertos,
      erros: ans.length - acertos,
      pct: pct(acertos, ans.length),
    };
  });

  const rowsPorTopico = (topics.data ?? [])
    .filter((t) => t.subject_id === currentSubject)
    .map((t) => {
      const ss = (sessions.data ?? []).filter((s) => s.topic_id === t.id);
      const ans = (answers.data ?? []).filter(
        (a) => questionTopic.get(a.question_id)?.topic_id === t.id,
      );
      const acertos = ans.filter((a) => a.is_correct).length;
      return {
        t: t.title,
        minutos: ss.reduce((x, s) => x + s.study_time_minutes, 0),
        ok: acertos,
        err: ans.length - acertos,
        pct: pct(acertos, ans.length),
      };
    });

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
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct(ok, ok + err)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ok} acertos · {err} erros em {ok + err} questões respondidas
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

      <Card>
        <h2 className="font-display text-lg font-bold">Engajamento Semanal dos Alunos</h2>
        <p className="text-xs text-muted-foreground">
          Últimas 5 semanas · verde = houve estudo registrado no dia
        </p>
        <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-3">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </span>
          ))}
          {days.map((d) => (
            <div key={d} className="grid place-items-center">
              <span
                title={d}
                className={`h-6 w-6 rounded-full sm:h-7 sm:w-7 ${
                  studiedDays.has(d) ? "bg-success" : "bg-destructive/40"
                }`}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Meus Alunos</h2>
        <p className="text-xs text-muted-foreground">Desempenho individual consolidado</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 pb-1 font-semibold">Aluno</th>
                <th className="px-4 pb-1 font-semibold">Tempo</th>
                <th className="px-4 pb-1 font-semibold">Acertadas</th>
                <th className="px-4 pb-1 font-semibold">Erradas</th>
                <th className="px-4 pb-1 font-semibold">% Acerto</th>
              </tr>
            </thead>
            <tbody>
              {perStudent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum aluno cadastrado ainda.
                  </td>
                </tr>
              )}
              {perStudent.map((r) => (
                <tr key={r.id} className="bg-muted/60">
                  <td className="rounded-l-2xl px-4 py-3.5 font-semibold">{r.nome}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {Math.floor(r.minutos / 60)}h {r.minutos % 60}m
                  </td>
                  <td className="px-4 py-3.5 font-medium text-success">{r.acertos} ✅</td>
                  <td className="px-4 py-3.5 font-medium text-destructive">{r.erros} ❌</td>
                  <td className="rounded-r-2xl px-4 py-3.5 font-display font-bold">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-bold">
          {subjects.data?.find((s) => s.id === currentSubject)?.title ?? "Matérias"}
        </h2>
        <p className="text-xs text-muted-foreground">Desempenho por subtópico · todos os alunos</p>

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
                    Cadastre tópicos para esta matéria abaixo.
                  </td>
                </tr>
              )}
              {rowsPorTopico.map((r) => (
                <tr key={r.t} className="bg-muted/60">
                  <td className="rounded-l-2xl px-4 py-3.5 font-semibold">{r.t}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {Math.floor(r.minutos / 60)}h {r.minutos % 60}m
                  </td>
                  <td className="px-4 py-3.5 font-medium text-success">{r.ok} ✅</td>
                  <td className="px-4 py-3.5 font-medium text-destructive">{r.err} ❌</td>
                  <td className="rounded-r-2xl px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-16 rounded-full bg-background">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
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

      <ContentManager subjectId={currentSubject} topicById={topicById} />
    </div>
  );
}

function ContentManager({
  subjectId,
  topicById,
}: {
  subjectId?: string;
  topicById: Map<string, { id: string; subject_id: string; title: string }>;
}) {
  const subjects = useSubjects();
  const topics = useTopics();
  const createSubject = useCreateSubject();
  const createTopic = useCreateTopic();
  const createQuestion = useCreateQuestion();

  const [subjectTitle, setSubjectTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSubject, setTopicSubject] = useState<string>("");
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [questionTopic, setQuestionTopic] = useState<string>("");

  const subjectOptions = subjects.data ?? [];
  const topicOptions = (topics.data ?? []).filter(
    (t) => t.subject_id === (topicSubject || subjectId),
  );

  const input =
    "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Gerenciador de Conteúdo</h2>
      <p className="text-xs text-muted-foreground">
        Cadastre novas matérias, tópicos e questões de simulados
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
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
              { subject_id: sid, title: topicTitle.trim() },
              { onSuccess: () => setTopicTitle("") },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Novo Tópico</p>
          <select
            className={`mt-3 ${input}`}
            value={topicSubject || subjectId || ""}
            onChange={(e) => setTopicSubject(e.target.value)}
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
          <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {createTopic.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar Tópico
          </button>
        </form>

        <form
          className="rounded-2xl bg-muted/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const topic = questionTopic || topicOptions[0]?.id;
            const sid = topic ? topicById.get(topic)?.subject_id : subjectId;
            const opts = options.map((o) => o.trim()).filter(Boolean);
            if (!sid || !statement.trim() || opts.length < 2) return;
            createQuestion.mutate(
              {
                subject_id: sid,
                topic_id: topic ?? null,
                statement: statement.trim(),
                options: opts,
                correct_answer: opts[Math.min(correct, opts.length - 1)],
              },
              {
                onSuccess: () => {
                  setStatement("");
                  setOptions(["", "", "", ""]);
                  setCorrect(0);
                },
              },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Nova Questão</p>
          <select
            className={`mt-3 ${input}`}
            value={questionTopic || topicOptions[0]?.id || ""}
            onChange={(e) => setQuestionTopic(e.target.value)}
          >
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <textarea
            className={`mt-3 ${input}`}
            rows={2}
            placeholder="Enunciado"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
          {options.map((o, i) => (
            <div key={i} className="mt-2 flex items-center gap-2">
              <input
                type="radio"
                name="correta"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`Alternativa correta ${i + 1}`}
              />
              <input
                className={input}
                placeholder={`Alternativa ${i + 1}`}
                value={o}
                onChange={(e) =>
                  setOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))
                }
              />
            </div>
          ))}
          <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {createQuestion.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar Questão
          </button>
        </form>
      </div>
    </Card>
  );
}
