import { useMemo, useState } from "react";
import { FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import {
  useCreateSubject,
  useCreateTopic,
  useDeleteSubject,
  useDeleteTopic,
  useSubjects,
  useTopics,
} from "@/lib/mentoria";

const input =
  "w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary";
const btn =
  "mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60";

/** Gerenciador de Conteúdo: apenas a arquitetura curricular — Matéria › Tópico › Subtópico. */
export function ContentManager() {
  const subjects = useSubjects();
  const topics = useTopics();
  const createSubject = useCreateSubject();
  const createTopic = useCreateTopic();
  const delSubject = useDeleteSubject();
  const delTopic = useDeleteTopic();

  const [subjectTitle, setSubjectTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSubject, setTopicSubject] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [parentTopic, setParentTopic] = useState("");
  const [error, setError] = useState<string | null>(null);

  const subjectOptions = subjects.data ?? [];
  const parents = useMemo(
    () => (topics.data ?? []).filter((t) => !t.parent_topic_id),
    [topics.data],
  );
  const childrenOf = (id: string) => (topics.data ?? []).filter((t) => t.parent_topic_id === id);

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
  const ok = () => setError(null);

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
        <FolderOpen className="h-5 w-5 text-primary" /> Gerenciador de Conteúdo
      </h2>
      <p className="text-xs text-muted-foreground">
        Estruture o ensino em Matéria › Tópico › Subtópico
      </p>

      {error && (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <form
          className="rounded-2xl bg-muted/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!subjectTitle.trim()) return;
            createSubject.mutate(
              { title: subjectTitle.trim() },
              { onSuccess: () => { setSubjectTitle(""); ok(); }, onError: fail },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Nova Matéria</p>
          <input
            className={`mt-3 ${input}`}
            placeholder="Ex: Língua Portuguesa"
            value={subjectTitle}
            onChange={(e) => setSubjectTitle(e.target.value)}
            aria-label="Nome da matéria"
          />
          <button disabled={createSubject.isPending} className={btn}>
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
            const sid = topicSubject || subjectOptions[0]?.id;
            if (!sid || !topicTitle.trim()) return;
            createTopic.mutate(
              { subject_id: sid, title: topicTitle.trim() },
              { onSuccess: () => { setTopicTitle(""); ok(); }, onError: fail },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Novo Tópico</p>
          <select
            className={`mt-3 ${input}`}
            value={topicSubject || subjectOptions[0]?.id || ""}
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
            aria-label="Nome do tópico"
          />
          <button disabled={createTopic.isPending} className={btn}>
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
            const pid = parentTopic || parents[0]?.id;
            const parent = parents.find((p) => p.id === pid);
            if (!parent || !subTitle.trim()) return;
            createTopic.mutate(
              {
                subject_id: parent.subject_id,
                title: subTitle.trim(),
                parent_topic_id: parent.id,
              },
              { onSuccess: () => { setSubTitle(""); ok(); }, onError: fail },
            );
          }}
        >
          <p className="font-display text-sm font-bold">Novo Subtópico</p>
          <select
            className={`mt-3 ${input}`}
            value={parentTopic || parents[0]?.id || ""}
            onChange={(e) => setParentTopic(e.target.value)}
            aria-label="Tópico do subtópico"
          >
            {parents.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <input
            className={`mt-3 ${input}`}
            placeholder="Ex: Sujeito composto"
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            aria-label="Nome do subtópico"
          />
          <button disabled={createTopic.isPending || parents.length === 0} className={btn}>
            {createTopic.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar Subtópico
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-3">
        <p className="font-display text-sm font-bold">Estrutura atual</p>
        {subjectOptions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma matéria cadastrada.</p>
        )}
        {subjectOptions.map((s) => (
          <div key={s.id} className="rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">{s.title}</p>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir a matéria "${s.title}" e seus tópicos?`))
                    delSubject.mutate(s.id, { onError: fail, onSuccess: ok });
                }}
                disabled={delSubject.isPending}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {parents.filter((t) => t.subject_id === s.id).length === 0 && (
                <li className="text-xs text-muted-foreground">Nenhum tópico nesta matéria.</li>
              )}
              {parents
                .filter((t) => t.subject_id === s.id)
                .map((t) => (
                  <li key={t.id} className="rounded-xl bg-card p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{t.title}</span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir o tópico "${t.title}"?`))
                            delTopic.mutate(t.id, { onError: fail, onSuccess: ok });
                        }}
                        disabled={delTopic.isPending}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 px-2 py-0.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1 pl-4">
                      {childrenOf(t.id).map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                        >
                          <span className="truncate">› {c.title}</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o subtópico "${c.title}"?`))
                                delTopic.mutate(c.id, { onError: fail, onSuccess: ok });
                            }}
                            disabled={delTopic.isPending}
                            className="shrink-0 rounded-full border border-destructive/30 px-2 py-0.5 font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
