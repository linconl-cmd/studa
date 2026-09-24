import { useMemo, useState } from "react";
import { ChevronDown, Eye, Link2, Loader2, Trash2, Users, X } from "lucide-react";
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
  useExerciseResults,
  useStudents,
  useSubjects,
  useTopics,
  useUpdateTopicUrl,
  type Activity,
  type ResultRow,
} from "@/lib/mentoria";
import { useRole, useSession } from "@/hooks/useSession";

import { formatDateBR, todayISO } from "@/lib/metrics";
import { ActivityCard } from "@/components/mentoria/ActivityBoard";
import { Dropdown, SupportLinksEditor, validLinks } from "@/components/mentoria/Pickers";
import type { SupportLink } from "@/lib/mentoria";

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-6 shadow-soft">{children}</section>;
}

function PreviewModal({
  activity,
  context,
  onClose,
}: {
  activity: Activity;
  context: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Visualizar como aluno</h3>
            <p className="text-xs text-muted-foreground">
              Confira o link antes de publicar — este card é somente leitura
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar pré-visualização"
            className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-5">
          <ActivityCard activity={activity} context={context} preview />
        </ul>
      </div>
    </div>
  );
}

/** Tela "Atividades": link oficial por tópico + atividades atribuídas, com pré-visualização. */
export function ActivityManager() {
  const subjects = useSubjects();
  const topics = useTopics();
  const updateUrl = useUpdateTopicUrl();
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const studentsQuery = useStudents(role === "mentor" ? user?.id : undefined);
  const results = useExerciseResults();
  const students = useMemo(
    () =>
      (studentsQuery.data ?? [])
        .filter((s) => s.role === "student")
        .map((s) => ({ id: s.id, full_name: s.full_name, email: s.email })),
    [studentsQuery.data],
  );

  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ activity: Activity; context: string } | null>(null);

  const currentSubject = subjectId ?? subjects.data?.[0]?.id;
  const myTopics = useMemo(
    () => (topics.data ?? []).filter((t) => t.subject_id === currentSubject),
    [topics.data, currentSubject],
  );
  const titleOf = useMemo(
    () => new Map((topics.data ?? []).map((t) => [t.id, t.title])),
    [topics.data],
  );
  const subjectTitle = subjects.data?.find((s) => s.id === currentSubject)?.title ?? "";

  const contextFor = (topicId: string, parentId: string | null) =>
    [subjectTitle, parentId ? titleOf.get(parentId) : null, titleOf.get(topicId)]
      .filter(Boolean)
      .join(" › ");

  return (
    <Card>
      <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
        <Link2 className="h-5 w-5 text-primary" /> Atividades e Links Oficiais
      </h2>
      <p className="text-xs text-muted-foreground">
        Cadastre o link oficial do caderno de cada tópico e as atividades que o aluno deve concluir
      </p>

      <div className="mt-4">
        <Dropdown
          label="Disciplina"
          value={currentSubject ?? ""}
          onChange={setSubjectId}
          options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.title }))}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {myTopics.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Nenhum tópico nesta matéria — cadastre no Gerenciador de Conteúdo.
          </li>
        )}
        {myTopics.map((t) => (
          <li key={t.id} className="rounded-2xl bg-muted/50 p-4">
            <p className="truncate text-sm font-semibold">
              {t.parent_topic_id ? `${titleOf.get(t.parent_topic_id) ?? "—"} › ` : ""}
              {t.title}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={input}
                type="url"
                placeholder="Link oficial do caderno de questões (https://…)"
                value={drafts[t.id] ?? t.exercise_url ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [t.id]: e.target.value }))}
                aria-label={`Link oficial de ${t.title}`}
              />
              <button
                onClick={() =>
                  updateUrl.mutate(
                    {
                      id: t.id,
                      exercise_url: (drafts[t.id] ?? t.exercise_url ?? "").trim() || null,
                    },
                    {
                      onError: (e: unknown) =>
                        setError(e instanceof Error ? e.message : "Não foi possível salvar."),
                      onSuccess: () => setError(null),
                    },
                  )
                }
                disabled={updateUrl.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {updateUrl.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar link
              </button>
            </div>
            <TopicActivities
              topicId={t.id}
              topicTitle={t.title}
              officialUrl={drafts[t.id]?.trim() || t.exercise_url}
              students={students}
              results={results.data ?? []}
              onPreview={(activity) =>
                setPreview({ activity, context: contextFor(t.id, t.parent_topic_id) })
              }
            />

          </li>
        ))}
      </ul>

      {preview && (
        <PreviewModal
          activity={preview.activity}
          context={preview.context}
          onClose={() => setPreview(null)}
        />
      )}
    </Card>
  );
}

export type StudentLite = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function TopicActivities({
  topicId,
  topicTitle,
  officialUrl,
  onPreview,
  students,
  results,
}: {
  topicId: string;
  topicTitle: string;
  officialUrl: string | null;
  onPreview: (activity: Activity) => void;
  students: StudentLite[];
  results: ResultRow[];
}) {
  const activities = useActivities();
  const create = useCreateActivity();
  const del = useDeleteActivity();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());

  const mine = (activities.data ?? []).filter((a) => a.topic_id === topicId && !a.student_id);
  const [links, setLinks] = useState<SupportLink[]>([]);
  const [linkError, setLinkError] = useState<string | null>(null);


  const draft: Activity = {
    id: "preview",
    topic_id: topicId,
    title: title.trim() || "Nova atividade",
    exercise_url: officialUrl,
    due_date: date,
    position: 0,
    created_at: new Date().toISOString(),
    support_links: links.filter((l) => l.url.trim()),
  };

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Atividades ({mine.length}) — usam o link oficial do tópico
      </p>
      <form
        className="mt-2 grid gap-2 sm:grid-cols-[1.6fr_auto_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          if (!validLinks(links)) {
            setLinkError("Os links de apoio devem começar com http:// ou https://");
            return;
          }
          setLinkError(null);
          create.mutate(
            {
              topic_id: topicId,
              title: title.trim(),
              exercise_url: officialUrl,
              due_date: date,
              support_links: links,
            },
            {
              onSuccess: () => {
                setTitle("");
                setLinks([]);
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
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={`Prazo de fechamento em ${topicTitle}`}
          title="Data de fechamento (prazo)"
        />
        <button
          type="button"
          onClick={() => onPreview(draft)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Eye className="h-4 w-4" /> Visualizar como aluno
        </button>
        <button
          disabled={create.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar
        </button>
        <div className="sm:col-span-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            Conteúdo de apoio (apostilas e videoaulas)
          </p>
          <SupportLinksEditor links={links} onChange={setLinks} />
          {linkError && <p className="mt-1 text-xs text-destructive">{linkError}</p>}
        </div>
      </form>
      <ul className="mt-2 space-y-1">
        {mine.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            students={students}
            results={results}
            onPreview={onPreview}
            onDelete={() => del.mutate(a.id)}
            deleting={del.isPending}
          />
        ))}
      </ul>
    </div>
  );
}

/** Linha de atividade com contagem de quem concluiu e quem está pendente. */
function ActivityRow({
  activity,
  students,
  results,
  onPreview,
  onDelete,
  deleting,
}: {
  activity: Activity;
  students: StudentLite[];
  results: ResultRow[];
  onPreview: (activity: Activity) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  const doneIds = new Set(
    results.filter((r) => r.activity_id === activity.id).map((r) => r.user_id),
  );
  const done = students.filter((s) => doneIds.has(s.id));
  const pending = students.filter((s) => !doneIds.has(s.id));

  return (
    <li className="rounded-xl bg-card/60 px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">
          {formatDateBR(activity.due_date)} · {activity.title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-semibold hover:bg-muted"
          >
            <Users className="h-3.5 w-3.5" /> {done.length}/{students.length} concluíram
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => onPreview(activity)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-semibold hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2 py-0.5 font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </span>
      </div>

      {open && (
        <div className="mt-2 grid gap-3 border-t border-border/60 pt-2 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-primary">Concluíram ({done.length})</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {done.length === 0 && <li>Ninguém registrou ainda.</li>}
              {done.map((s) => (
                <li key={s.id} className="truncate">
                  {s.full_name?.trim() || s.email || "Aluno"}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-destructive">Pendentes ({pending.length})</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {pending.length === 0 && <li>Todos concluíram 🎉</li>}
              {pending.map((s) => (
                <li key={s.id} className="truncate">
                  {s.full_name?.trim() || s.email || "Aluno"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

