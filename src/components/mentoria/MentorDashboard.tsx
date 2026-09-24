import { useState } from "react";
import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  useExerciseResults,
  useStudents,
  useStudySessions,
  useSubjects,
  useTopics,
} from "@/lib/mentoria";
import { lastDays, pct } from "@/lib/metrics";
import { RankingScreen } from "@/components/mentoria/Ranking";
import { StudentDetail } from "@/components/mentoria/StudentDetail";
import { ContentManager } from "@/components/mentoria/ContentManager";
import { ActivityManager } from "@/components/mentoria/ActivityManager";
import { StudentPlanning } from "@/components/mentoria/StudentPlanning";
import { Dropdown } from "@/components/mentoria/Pickers";
import { useRole, useSession } from "@/hooks/useSession";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

export function MentorDashboard({ section = "Home" }: { section?: string }) {
  const showHome = section === "Home";
  const showStudents = section === "Meus Alunos";
  const showContent = section === "Gerenciador de Conteúdo";
  const showActivities = section === "Atividades";
  const showRanking = section === "Ranking";

  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  // Mentor: apenas os próprios alunos. Admin master: todos.
  const students = useStudents(role === "mentor" ? user?.id : undefined);
  const sessions = useStudySessions();
  const results = useExerciseResults();
  const subjects = useSubjects();
  const topics = useTopics();

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const currentSubject = subjectId ?? subjects.data?.[0]?.id;
  const [selectedId, setSelectedId] = useState("");

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
            Selecione um aluno no menu para ver o detalhamento completo
          </p>
          {students.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando alunos…</p>
          ) : perStudent.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
          ) : (
            <div className="mt-4">
              <Dropdown
                label="Aluno"
                value={selectedId}
                onChange={setSelectedId}
                placeholder="Escolha um aluno…"
                options={perStudent.map((r) => ({
                  value: r.id,
                  label: `${r.nome} · ${r.pct}% · ${r.acertos} ✅ ${r.erros} ❌`,
                }))}
              />
            </div>
          )}
        </Card>
      )}

      {(showHome || showStudents) && selectedId && (
        <StudentDetail
          studentId={selectedId}
          studentName={perStudent.find((p) => p.id === selectedId)?.nome ?? "Aluno"}
          onClose={() => setSelectedId("")}
        />
      )}

      {(showHome || showStudents) && (
        <Card>
          <h2 className="font-display text-2xl font-bold">
            {subjects.data?.find((s) => s.id === currentSubject)?.title ?? "Matérias"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Desempenho por subtópico · todos os alunos
          </p>

          <div className="mt-4">
            <Dropdown
              label="Disciplina"
              value={currentSubject ?? ""}
              onChange={setSubjectId}
              options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.title }))}
            />
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

      {showContent && <ContentManager />}
      {showActivities && <ActivityManager />}

      {section === "Planejamento Individual" && <StudentPlanning />}
    </div>
  );
}
