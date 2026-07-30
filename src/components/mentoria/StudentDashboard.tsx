import { useMemo, useState } from "react";
import { Clock, Loader2, CalendarCheck, ExternalLink, ListChecks, Trash2 } from "lucide-react";
import {
  useDeleteResult,
  useExerciseResults,
  useLogResult,
  useLogStudy,
  useStudySessions,
  useSubjects,
  useTopics,
} from "@/lib/mentoria";
import { lastDays, pct, todayISO, formatDateBR, weekdayIndex } from "@/lib/metrics";
import { RankingPreviewCard, RankingScreen } from "@/components/mentoria/Ranking";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

export function StudentDashboard({
  userId,
  section = "Home",
}: {
  userId: string;
  section?: string;
}) {
  const subjects = useSubjects();
  const topics = useTopics();
  const sessions = useStudySessions(userId);
  const results = useExerciseResults(userId);

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;

  const logStudy = useLogStudy();
  const logResult = useLogResult();
  const delResult = useDeleteResult();

  const [topicId, setTopicId] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(todayISO());

  const [resTopic, setResTopic] = useState("");
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const [resDate, setResDate] = useState(todayISO());

  const myTopics = (topics.data ?? []).filter((t) => t.subject_id === currentSubject);
  const totalMin = (sessions.data ?? []).reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = (results.data ?? []).reduce((a, r) => a + r.correct_count, 0);
  const err = (results.data ?? []).reduce((a, r) => a + r.wrong_count, 0);
  const days = lastDays(35);
  const studiedDays = useMemo(
    () => new Set((sessions.data ?? []).map((s) => s.date)),
    [sessions.data],
  );
  const topicTitle = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );

  const rows = myTopics.map((t) => {
    const ss = (sessions.data ?? []).filter((s) => s.topic_id === t.id);
    const rr = (results.data ?? []).filter((r) => r.topic_id === t.id);
    const tOk = rr.reduce((a, r) => a + r.correct_count, 0);
    const tErr = rr.reduce((a, r) => a + r.wrong_count, 0);
    return {
      id: t.id,
      title: t.title,
      url: t.exercise_url,
      minutos: ss.reduce((x, s) => x + s.study_time_minutes, 0),
      ok: tOk,
      err: tErr,
      pct: pct(tOk, tOk + tErr),
    };
  });

  if (section === "Ranking") {
    return <RankingScreen highlightUserId={userId} />;
  }

  const showHome = section === "Home";

  return (
    <div className="flex flex-col gap-5">
      {showHome && (
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
              {ok} acertos ✅ · {err} erros ❌
            </p>
          </Card>

          <RankingPreviewCard userId={userId} />
        </div>
      )}

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
            aria-label="Tópico estudado"
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
          {Array.from({ length: weekdayIndex(days[0]) }).map((_, i) => (
            <span key={`pad-${i}`} aria-hidden />
          ))}
          {days.map((d) => (
            <div key={d} className="grid place-items-center">
              <span
                title={formatDateBR(d)}
                className={`h-6 w-6 rounded-full sm:h-7 sm:w-7 ${
                  studiedDays.has(d) ? "bg-success" : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" />
          {studiedDays.has(todayISO()) ? "Você estudou hoje!" : "Ainda não estudou hoje"}
        </p>
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

        <h2 className="mt-5 font-display text-lg font-bold">Cadernos de Questões</h2>
        <p className="text-xs text-muted-foreground">
          Acesse o material externo indicado pelo mentor e depois registre seus resultados
        </p>
        <ul className="mt-4 space-y-2">
          {rows.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum tópico disponível ainda.</li>
          )}
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.floor(r.minutos / 60)}h {r.minutos % 60}m · {r.ok} ✅ · {r.err} ❌ ·{" "}
                  {r.pct}%
                </p>
              </div>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir caderno
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Sem link</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <ListChecks className="h-5 w-5 text-primary" /> Registrar Resultados
        </h2>
        <p className="text-xs text-muted-foreground">
          Informe quantas questões você acertou e errou — a porcentagem é calculada
          automaticamente
        </p>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const t = resTopic || myTopics[0]?.id;
            const a = parseInt(acertos || "0", 10);
            const b = parseInt(erros || "0", 10);
            if (!t || a < 0 || b < 0 || a + b === 0) return;
            logResult.mutate(
              {
                user_id: userId,
                topic_id: t,
                correct_count: a,
                wrong_count: b,
                date: resDate,
              },
              {
                onSuccess: () => {
                  setAcertos("");
                  setErros("");
                },
              },
            );
          }}
        >
          <select
            className={input}
            value={resTopic || myTopics[0]?.id || ""}
            onChange={(e) => setResTopic(e.target.value)}
            aria-label="Tópico do caderno"
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
            min={0}
            placeholder="Acertos"
            value={acertos}
            onChange={(e) => setAcertos(e.target.value)}
            aria-label="Quantidade de Acertos"
          />
          <input
            className={input}
            type="number"
            min={0}
            placeholder="Erros"
            value={erros}
            onChange={(e) => setErros(e.target.value)}
            aria-label="Quantidade de Erros"
          />
          <input
            className={input}
            type="date"
            value={resDate}
            onChange={(e) => setResDate(e.target.value)}
            aria-label="Data do resultado"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {logResult.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Registrar
          </button>
        </form>

        {parseInt(acertos || "0", 10) + parseInt(erros || "0", 10) > 0 && (
          <p className="mt-3 text-xs font-semibold text-primary">
            Aproveitamento previsto:{" "}
            {pct(parseInt(acertos || "0", 10), parseInt(acertos || "0", 10) + parseInt(erros || "0", 10))}
            %
          </p>
        )}

        <h3 className="mt-6 font-display text-sm font-bold">Meus registros recentes</h3>
        <ul className="mt-3 space-y-2">
          {(results.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum resultado registrado ainda.</li>
          )}
          {(results.data ?? []).slice(0, 10).map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {topicTitle.get(r.topic_id) ?? "Tópico removido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateBR(r.date)} · {r.correct_count} ✅ · {r.wrong_count} ❌
                </p>
              </div>
              <span className="font-display font-bold">
                {pct(r.correct_count, r.correct_count + r.wrong_count)}%
              </span>
              <button
                onClick={() => delResult.mutate(r.id)}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
