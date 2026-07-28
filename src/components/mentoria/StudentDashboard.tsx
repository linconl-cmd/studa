import { useMemo, useState } from "react";
import { Clock, Loader2, Target, CalendarCheck } from "lucide-react";
import {
  useAnswers,
  useLogStudy,
  useQuestions,
  useStudySessions,
  useSubjects,
  useSubmitAnswer,
  useTopics,
} from "@/lib/mentoria";
import { lastDays, pct, todayISO } from "@/lib/metrics";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

export function StudentDashboard({ userId }: { userId: string }) {
  const subjects = useSubjects();
  const topics = useTopics();
  const sessions = useStudySessions(userId);
  const answers = useAnswers(userId);

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;
  const questions = useQuestions(currentSubject);

  const logStudy = useLogStudy();
  const submitAnswer = useSubmitAnswer();

  const [topicId, setTopicId] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(todayISO());
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});

  const myTopics = (topics.data ?? []).filter((t) => t.subject_id === currentSubject);
  const totalMin = (sessions.data ?? []).reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = (answers.data ?? []).filter((a) => a.is_correct).length;
  const total = (answers.data ?? []).length;
  const days = lastDays(35);
  const studiedDays = useMemo(
    () => new Set((sessions.data ?? []).map((s) => s.date)),
    [sessions.data],
  );
  const answeredIds = new Set((answers.data ?? []).map((a) => a.question_id));

  const rows = myTopics.map((t) => {
    const ss = (sessions.data ?? []).filter((s) => s.topic_id === t.id);
    return {
      id: t.id,
      title: t.title,
      minutos: ss.reduce((x, s) => x + s.study_time_minutes, 0),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <p className="font-display text-sm font-semibold text-muted-foreground">
            Tempo Total de Estudo
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none">
              {Math.floor(totalMin / 60)}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">h {totalMin % 60}min</span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Clock className="h-3.5 w-3.5" /> {sessions.data?.length ?? 0} sessões registradas
          </p>
        </Card>

        <Card>
          <p className="font-display text-sm font-semibold text-muted-foreground">
            Minha Taxa de Acerto
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none">{pct(ok, total)}%</span>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct(ok, total)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ok} acertos ✅ · {total - ok} erros ❌
          </p>
        </Card>

        <Card>
          <p className="font-display text-sm font-semibold text-muted-foreground">
            Constância nos Estudos
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none">
              {days.filter((d) => studiedDays.has(d)).length}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">dias / 35</span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />
            {studiedDays.has(todayISO()) ? "Você estudou hoje!" : "Ainda não estudou hoje"}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold">Registrar Estudo</h2>
        <p className="text-xs text-muted-foreground">Anote o tempo dedicado a cada tópico</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const t = topicId || myTopics[0]?.id;
            const m = parseInt(minutes, 10);
            if (!t || !m || m <= 0) return;
            logStudy.mutate({ user_id: userId, topic_id: t, study_time_minutes: m, date });
          }}
        >
          <select
            className={input}
            value={topicId || myTopics[0]?.id || ""}
            onChange={(e) => setTopicId(e.target.value)}
          >
            {myTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <input
            className={input}
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-label="Minutos estudados"
          />
          <input
            className={input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Data do estudo"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {logStudy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar
          </button>
        </form>

        <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
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

        <h2 className="mt-5 font-display text-lg font-bold">Meu Tempo por Tópico</h2>
        <ul className="mt-3 space-y-2">
          {rows.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum tópico disponível ainda.</li>
          )}
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3"
            >
              <p className="truncate text-sm font-semibold">{r.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {Math.floor(r.minutos / 60)}h {r.minutos % 60}m
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Simulados e Exercícios</h2>
        <p className="text-xs text-muted-foreground">
          Responda às questões criadas pelo mentor e acompanhe seu resultado
        </p>

        <div className="mt-4 space-y-3">
          {(questions.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma questão publicada nesta matéria ainda.
            </p>
          )}
          {(questions.data ?? []).map((q) => {
            const done = q.id in feedback || answeredIds.has(q.id);
            return (
              <div key={q.id} className="rounded-2xl bg-muted/60 p-4">
                <p className="text-sm font-semibold">{q.statement}</p>
                <div className="mt-3 space-y-2">
                  {q.options.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        disabled={done}
                        checked={selected[q.id] === o}
                        onChange={() => setSelected((p) => ({ ...p, [q.id]: o }))}
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
                {done ? (
                  <p
                    className={`mt-3 text-xs font-semibold ${
                      feedback[q.id] ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {q.id in feedback
                      ? feedback[q.id]
                        ? "Resposta correta ✅"
                        : "Resposta incorreta ❌"
                      : "Você já respondeu esta questão."}
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      const sel = selected[q.id];
                      if (!sel) return;
                      submitAnswer.mutate(
                        { question_id: q.id, selected_answer: sel },
                        {
                          onSuccess: (correct) =>
                            setFeedback((p) => ({ ...p, [q.id]: correct })),
                        },
                      );
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <Target className="h-3.5 w-3.5" /> Responder
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
