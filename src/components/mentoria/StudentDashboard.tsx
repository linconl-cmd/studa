import { useMemo, useState } from "react";
import { Clock, Loader2, ListChecks, Trash2 } from "lucide-react";
import {
  parseCount,
  useDeleteResult,
  useExerciseResults,
  useLogResult,
  useStudySessions,
  useSubjects,
  useTopics,
  useAutoAttendance,
} from "@/lib/mentoria";
import { pct, todayISO, formatDateBR } from "@/lib/metrics";
import { RankingPreviewCard, RankingScreen } from "@/components/mentoria/Ranking";
import { ActivityBoard } from "@/components/mentoria/ActivityBoard";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

export function StudentDashboard({
  userId,
  section = "Home",
  onSelectSection,
}: {
  userId: string;
  section?: string;
  onSelectSection?: (section: string) => void;
}) {
  const subjects = useSubjects();
  const topics = useTopics();
  const sessions = useStudySessions(userId);
  const results = useExerciseResults(userId);

  // frequência automática: qualquer acesso do aluno marca presença no dia
  useAutoAttendance(userId, topics.data?.[0]?.id);

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;

  const logResult = useLogResult();
  const delResult = useDeleteResult();

  const [resTopic, setResTopic] = useState("");
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [resDate, setResDate] = useState(todayISO());

  const myTopics = (topics.data ?? []).filter((t) => t.subject_id === currentSubject);
  const totalMin = (sessions.data ?? []).reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = (results.data ?? []).reduce((a, r) => a + r.correct_count, 0);
  const err = (results.data ?? []).reduce((a, r) => a + r.wrong_count, 0);
  const topicTitle = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );

  if (section === "Ranking") {
    return <RankingScreen highlightUserId={userId} />;
  }

  if (section === "Minhas Atividades") {
    return <ActivityBoard userId={userId} />;
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

          <RankingPreviewCard
            userId={userId}
            onOpenRanking={onSelectSection ? () => onSelectSection("Ranking") : undefined}
          />
        </div>
      )}

      {showHome && (
        <button
          onClick={() => onSelectSection?.("Minhas Atividades")}
          className="self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ver minhas atividades
        </button>
      )}


      <Card>
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <ListChecks className="h-5 w-5 text-primary" /> Registrar Resultados
        </h2>
        <p className="text-xs text-muted-foreground">
          Informe quantas questões você acertou e errou — a porcentagem é calculada automaticamente
        </p>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const t = resTopic || myTopics[0]?.id;
            const a = parseCount(acertos);
            const b = parseCount(erros);
            if (!t) {
              setFormError("Selecione um tópico.");
              return;
            }
            if (a === null || b === null) {
              setFormError("Informe apenas números inteiros maiores ou iguais a zero.");
              return;
            }
            if (a + b === 0) {
              setFormError("Registre ao menos uma questão resolvida.");
              return;
            }
            setFormError(null);
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
                onError: (err) =>
                  setFormError(
                    err instanceof Error ? err.message : "Não foi possível registrar.",
                  ),
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
            step={1}
            inputMode="numeric"
            placeholder="Acertos"
            value={acertos}
            onChange={(e) => setAcertos(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Quantidade de Acertos"
          />
          <input
            className={input}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="Erros"
            value={erros}
            onChange={(e) => setErros(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Quantidade de Erros"
          />
          <input
            className={input}
            type="date"
            value={resDate}
            onChange={(e) => setResDate(e.target.value)}
            aria-label="Data do resultado"
          />
          <button
            disabled={logResult.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {logResult.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Registrar
          </button>
          {formError && <p className="text-xs text-destructive sm:col-span-5">{formError}</p>}
        </form>

        {parseInt(acertos || "0", 10) + parseInt(erros || "0", 10) > 0 && (
          <p className="mt-3 text-xs font-semibold text-primary">
            Aproveitamento previsto:{" "}
            {pct(
              parseInt(acertos || "0", 10),
              parseInt(acertos || "0", 10) + parseInt(erros || "0", 10),
            )}
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
