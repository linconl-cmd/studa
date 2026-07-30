import { useMemo, useState } from "react";
import { Trophy, Medal, BarChart3, Loader2 } from "lucide-react";
import { useExerciseResults, useRanking, useTopics } from "@/lib/mentoria";
import { pct } from "@/lib/metrics";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

export function RankingPreviewCard({ userId }: { userId: string }) {
  const ranking = useRanking();
  const rows = ranking.data ?? [];
  const index = rows.findIndex((r) => r.user_id === userId);
  const me = index >= 0 ? rows[index] : undefined;

  return (
    <Card>
      <p className="font-display text-sm font-semibold text-muted-foreground">
        Prévia do Ranking
      </p>
      {ranking.isLoading ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      ) : (
        <>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none">
              {index >= 0 ? `${index + 1}º` : "—"}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">
              de {rows.length} alunos
            </span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Trophy className="h-3.5 w-3.5" />
            {me ? `${me.correct_count} acertos · ${me.accuracy}% de acerto` : "Registre resultados para entrar no ranking"}
          </p>
        </>
      )}
    </Card>
  );
}

export function RankingScreen({ highlightUserId }: { highlightUserId?: string }) {
  const topics = useTopics();
  const [topicId, setTopicId] = useState<string>("");
  const ranking = useRanking(topicId || undefined);
  const results = useExerciseResults();

  const rows = ranking.data ?? [];
  const topicTitle = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );

  const totalOk = rows.reduce((a, r) => a + r.correct_count, 0);
  const totalErr = rows.reduce((a, r) => a + r.wrong_count, 0);
  const ativos = rows.filter((r) => r.correct_count + r.wrong_count > 0);
  const mediaAcertos = ativos.length ? Math.round(totalOk / ativos.length) : 0;

  const porTopico = useMemo(() => {
    const map = new Map<string, { ok: number; err: number }>();
    for (const r of results.data ?? []) {
      const cur = map.get(r.topic_id) ?? { ok: 0, err: 0 };
      cur.ok += r.correct_count;
      cur.err += r.wrong_count;
      map.set(r.topic_id, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        title: topicTitle.get(id) ?? "Tópico removido",
        ...v,
        pct: pct(v.ok, v.ok + v.err),
      }))
      .sort((a, b) => b.err - a.err);
  }, [results.data, topicTitle]);

  const medal = (i: number) =>
    i === 0 ? "bg-primary text-primary-foreground" : i < 3 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="font-display text-lg font-bold">Ranking dos Alunos</h2>
        <p className="text-xs text-muted-foreground">
          Classificação por acertos registrados · filtre por tópico ou veja o geral
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTopicId("")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              topicId === ""
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            Geral
          </button>
          {(topics.data ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => setTopicId(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                topicId === t.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-2">
          {ranking.isLoading && (
            <li className="text-sm text-muted-foreground">Carregando ranking…</li>
          )}
          {!ranking.isLoading && rows.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nenhum aluno com resultados registrados ainda.
            </li>
          )}
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-3 ${
                r.user_id === highlightUserId ? "bg-secondary/70" : "bg-muted/60"
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold ${medal(i)}`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {r.full_name?.trim() || "Aluno"}
                  {r.user_id === highlightUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.correct_count} ✅ · {r.wrong_count} ❌ ·{" "}
                  {Math.floor(r.study_minutes / 60)}h {r.study_minutes % 60}m
                </p>
              </div>
              <span className="font-display text-lg font-bold">{r.accuracy}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <BarChart3 className="h-5 w-5 text-primary" /> Relatórios de Dados
        </h2>
        <p className="text-xs text-muted-foreground">Resumo analítico consolidado</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Taxa de aproveitamento da turma
            </p>
            <p className="mt-2 font-display text-3xl font-bold">{pct(totalOk, totalOk + totalErr)}%</p>
            <div className="mt-3 h-2 w-full rounded-full bg-background">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${pct(totalOk, totalOk + totalErr)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Média de acertos acumulados
            </p>
            <p className="mt-2 font-display text-3xl font-bold">{mediaAcertos}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              por aluno ativo ({ativos.length} de {rows.length})
            </p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Questões resolvidas</p>
            <p className="mt-2 font-display text-3xl font-bold">{totalOk + totalErr}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalOk} acertos ✅ · {totalErr} erros ❌
            </p>
          </div>
        </div>

        <h3 className="mt-6 inline-flex items-center gap-2 font-display text-sm font-bold">
          <Medal className="h-4 w-4 text-primary" /> Tópicos com mais erros
        </h3>
        <ul className="mt-3 space-y-2">
          {porTopico.length === 0 && (
            <li className="text-sm text-muted-foreground">Sem resultados registrados ainda.</li>
          )}
          {porTopico.slice(0, 6).map((t) => (
            <li
              key={t.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.ok} ✅ · {t.err} ❌
                </p>
              </div>
              <span className="font-display font-bold">{t.pct}%</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
