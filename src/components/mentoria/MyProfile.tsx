import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useSession";

export function MyProfile({ userId, roleLabel }: { userId: string; roleLabel: string }) {
  const profile = useProfile(userId);
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name ?? "");
    setAvatarUrl(profile.data.avatar_url ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), avatar_url: avatarUrl.trim() || null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  const input =
    "w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        try {
          await save.mutateAsync();
          setSaved(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível salvar.");
        }
      }}
      className="max-w-xl rounded-3xl bg-card p-6 shadow-soft"
    >
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {(fullName || "U").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{fullName || "Usuário"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile.data?.email} · {roleLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-xs font-semibold text-muted-foreground">
          Nome completo
          <input
            className={`${input} mt-1`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          URL da foto de perfil
          <input
            className={`${input} mt-1`}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {saved && <p className="mt-4 text-sm text-success">Perfil atualizado.</p>}

      <button
        disabled={save.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar perfil
      </button>
    </form>
  );
}
