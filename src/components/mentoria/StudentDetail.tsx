import { useMemo } from "react";
import { X, Clock, CalendarCheck, TrendingUp } from "lucide-react";
import { useExerciseResults, useStudySessions, useTopics } from "@/lib/mentoria";
import { lastDays, pct, formatDateBR } from "@/lib/metrics";

export function StudentDetail({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const sessions = useStudySessions(studentId);
  const results = useExerciseResults(studentId);
  const topics = useTopics();

  const topicTitle = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );

  const ss = sessions.data ?? [];
  const rr = results.data ?? [];
  const totalMin = ss.reduce((a, s) => a + s.study_time_minutes, 0);
  const ok = rr.reduce((a, r) => a + r.correct_count, 0);
  const err = rr.reduce((a, r) => a + r.wrong_count, 0);

  const days = lastDays(28);
  const studied = new Set(ss.map((s) => s.date));
  const diasAtivos = days.filter((d) => studied.has(d)).length;

  const porTopico = useMemo(() => {
    const map = new Map<string, { min: number; ok: number; err: number }>();
    for (const s of ss) {
      const cur = map.get(s.topic_id) ?? { min: 0, ok: 0, err: 0 };
      cur.min += s.study_time_minutes;
      map.set(s.topic_id, cur);
    }
    for (const r of rr) {
      const cur = map.get(r.topic_id) ?? { min: 0, ok: 0, err: 0 };
      cur.ok += r.correct_count;
      cur.err += r.wrong_count;
      map.set(r.topic_id, cur);
    }
    return [...map.entries()].map(([id, v]) => ({
      id,
      title: topicTitle.get(id) ?? "Tópico removido",
      ...v,
      pct: pct(v.ok, v.ok + v.err),
    }));
  }, [ss, rr, topicTitle]);

  const metade = Math.ceil(rr.length / 2);
  const recentes = rr.slice(0, metade);
  const antigos = rr.slice(metade);
  const pctRecente = pct(
    recentes.reduce((a, r) => a + r.correct_count, 0),
    recentes.reduce((a, r) => a + r.correct_count + r.wrong_count, 0),
  );
  const pctAntigo = pct(
    antigos.reduce((a, r) => a + r.correct_count, 0),
    antigos.reduce((a, r) => a + r.correct_count + r.wrong_count, 0),
  );
  const evolucao = pctRecente - pctAntigo;
  const ultimoAcesso = ss[0]?.date ?? rr[0]?.date;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{studentName}</h2>
            <p className="text-sm text-muted-foreground">
              Detalhamento individual de frequência e desempenho
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar detalhes do aluno"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-6 font-display text-sm font-bold">Frequência de uso da plataforma</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Tempo total</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {Math.floor(totalMin / 60)}h {totalMin % 60}m
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {ss.length} registros
            </p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Dias ativos (28 dias)</p>
            <p className="mt-1 font-display text-2xl font-bold">{diasAtivos}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round((diasAtivos / 28) * 100)}% de assiduidade
            </p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Último registro</p>
            <p className="mt-1 font-display text-2xl font-bold">{formatDateBR(ultimoAcesso)}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarCheck className="h-3.5 w-3.5" /> histórico de acessos
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {days.map((d) => (
            <span
              key={d}
              title={d}
              className={`h-5 rounded-full ${studied.has(d) ? "bg-success" : "bg-muted"}`}
            />
          ))}
        </div>

        <h3 className="mt-6 font-display text-sm font-bold">Desempenho geral</h3>
        <div className="mt-3 rounded-2xl bg-muted/60 p-4">
          <div className="flex items-end justify-between gap-3">
            <span className="font-display text-4xl font-bold">{pct(ok, ok + err)}%</span>
            <span className="text-xs text-muted-foreground">
              {ok} acertos ✅ · {err} erros ❌ em {ok + err} questões
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-background">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct(ok, ok + err)}%` }} />
          </div>
        </div>

        <h3 className="mt-6 font-display text-sm font-bold">Desempenho por tópico</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 pb-1 font-semibold">Tópico</th>
                <th className="px-4 pb-1 font-semibold">Tempo</th>
                <th className="px-4 pb-1 font-semibold">Acertos</th>
                <th className="px-4 pb-1 font-semibold">Erros</th>
                <th className="px-4 pb-1 font-semibold">% Acerto</th>
              </tr>
            </thead>
            <tbody>
              {porTopico.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Este aluno ainda não registrou estudos nem resultados.
                  </td>
                </tr>
              )}
              {porTopico.map((t) => (
                <tr key={t.id} className="bg-muted/60">
                  <td className="rounded-l-2xl px-4 py-3 font-semibold">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {Math.floor(t.min / 60)}h {t.min % 60}m
                  </td>
                  <td className="px-4 py-3 font-medium text-success">{t.ok} ✅</td>
                  <td className="px-4 py-3 font-medium text-destructive">{t.err} ❌</td>
                  <td className="rounded-r-2xl px-4 py-3 font-display font-bold">{t.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 inline-flex items-center gap-2 font-display text-sm font-bold">
          <TrendingUp className="h-4 w-4 text-primary" /> Relatório individual
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-2xl bg-muted/60 px-4 py-3">
            <span className="font-semibold">Evolução recente:</span>{" "}
            {rr.length < 2
              ? "poucos registros para calcular tendência."
              : `${evolucao >= 0 ? "+" : ""}${evolucao} pontos percentuais (de ${pctAntigo}% para ${pctRecente}%).`}
          </li>
          <li className="rounded-2xl bg-muted/60 px-4 py-3">
            <span className="font-semibold">Ponto de atenção:</span>{" "}
            {porTopico.length
              ? `${[...porTopico].sort((a, b) => b.err - a.err)[0].title} concentra o maior número de erros.`
              : "sem dados suficientes."}
          </li>
          <li className="rounded-2xl bg-muted/60 px-4 py-3">
            <span className="font-semibold">Melhor desempenho:</span>{" "}
            {porTopico.length
              ? `${[...porTopico].sort((a, b) => b.pct - a.pct)[0].title} com ${[...porTopico].sort((a, b) => b.pct - a.pct)[0].pct}% de acerto.`
              : "sem dados suficientes."}
          </li>
          <li className="rounded-2xl bg-muted/60 px-4 py-3">
            <span className="font-semibold">Consistência:</span>{" "}
            {diasAtivos >= 14
              ? "rotina consistente nas últimas 4 semanas."
              : diasAtivos >= 7
                ? "rotina moderada — vale reforçar a constância."
                : "baixa frequência — recomendável contato direto."}
          </li>
        </ul>
      </div>
    </div>
  );
}
