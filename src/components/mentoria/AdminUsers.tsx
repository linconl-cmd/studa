import { formatDateBR } from "@/lib/metrics";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteUserAccount } from "@/lib/admin.functions";
import { useMentors, useSetStudentTeacher, useSetUserRole } from "@/lib/mentoria";
import type { AppRole } from "@/hooks/useSession";

type ManagedUser = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  teacher_id: string | null;
  role: AppRole;
};

function useManagedUsers() {
  return useQuery({
    queryKey: ["managed_users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at, teacher_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (rolesError) throw rolesError;
      const roleOf = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return (profiles ?? [])
        .map((p) => ({ ...p, role: roleOf.get(p.id) ?? "student" }) as ManagedUser)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
  });
}

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const users = useManagedUsers();
  const qc = useQueryClient();
  const remove = useServerFn(deleteUserAccount);
  const setRole = useSetUserRole();
  const mentors = useMentors();
  const setTeacher = useSetStudentTeacher();
  const [savingTeacher, setSavingTeacher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teacherName = new Map((mentors.data ?? []).map((m) => [m.id, m.full_name?.trim() || "Mentor"]));

  const del = useMutation({
    mutationFn: async (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["managed_users"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Não foi possível remover a conta."),
  });

  if (users.isLoading) {
    return (
      <div className="grid place-items-center rounded-3xl bg-card p-10 shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const groups: { key: AppRole; title: string; icon: typeof UserRound }[] = [
    { key: "super_admin", title: "Admin Master", icon: ShieldCheck },
    { key: "mentor", title: "Mentores", icon: ShieldCheck },
    { key: "student", title: "Alunos", icon: UserRound },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {groups.map((g) => {
        const rows = (users.data ?? []).filter((u) => u.role === g.key);
        return (
          <section key={g.key} className="rounded-3xl bg-card p-6 shadow-soft">
            <header className="mb-4 flex items-center gap-2">
              <g.icon className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-bold">{g.title}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {rows.length}
              </span>
            </header>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário neste grupo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2">Nome</th>
                      <th className="pb-2">E-mail</th>
                      <th className="pb-2">Cadastro</th>
                      <th className="pb-2">Papel</th>
                      <th className="pb-2">Professor</th>
                      <th className="pb-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className="border-t border-border/70">
                        <td className="py-3 font-medium">{u.full_name || "—"}</td>
                        <td className="py-3 text-muted-foreground">{u.email ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">{formatDateBR(u.created_at)}</td>
                        <td className="py-3">
                          {u.id === currentUserId ? (
                            <span className="text-xs text-muted-foreground">Admin Master</span>
                          ) : (
                            <select
                              value={u.role}
                              disabled={setRole.isPending}
                              onChange={(e) =>
                                setRole.mutate(
                                  { userId: u.id, role: e.target.value as AppRole },
                                  {
                                    onSuccess: () => setError(null),
                                    onError: (err: unknown) =>
                                      setError(
                                        err instanceof Error
                                          ? err.message
                                          : "Não foi possível alterar o papel.",
                                      ),
                                  },
                                )
                              }
                              className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary disabled:opacity-50"
                            >
                              <option value="student">Aluno</option>
                              <option value="mentor">Mentor</option>
                              <option value="super_admin">Admin Master</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3">
                          {u.role !== "student" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={u.teacher_id ?? ""}
                                disabled={savingTeacher === u.id || mentors.isLoading}
                                onChange={(e) => {
                                  const value = e.target.value || null;
                                  setSavingTeacher(u.id);
                                  setTeacher.mutate(
                                    { studentId: u.id, teacherId: value },
                                    {
                                      onSuccess: () => setError(null),
                                      onError: (err: unknown) =>
                                        setError(
                                          err instanceof Error
                                            ? err.message
                                            : "Não foi possível alterar o vínculo.",
                                        ),
                                      onSettled: () => setSavingTeacher(null),
                                    },
                                  );
                                }}
                                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary disabled:opacity-50"
                                aria-label={`Professor de ${u.full_name || u.email || "aluno"}`}
                              >
                                <option value="">Sem Professor</option>
                                {(mentors.data ?? []).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.full_name?.trim() || "Mentor"}
                                  </option>
                                ))}
                              </select>
                              {savingTeacher === u.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              )}
                              {!u.teacher_id && savingTeacher !== u.id && (
                                <span className="text-xs text-muted-foreground">
                                  Sem Professor
                                </span>
                              )}
                              {u.teacher_id && savingTeacher !== u.id && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {teacherName.get(u.teacher_id) ?? "Professor"}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 text-right">
                          {u.id === currentUserId ? (
                            <span className="text-xs text-muted-foreground">Você</span>
                          ) : (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remover definitivamente ${u.email ?? u.full_name}?`,
                                  )
                                )
                                  del.mutate(u.id);
                              }}
                              disabled={del.isPending}
                              className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
