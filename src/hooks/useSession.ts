import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "mentor" | "student";

export const INVITE_CODE_STORAGE_KEY = "guerreiros:invite-code";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * Garante perfil + papel do usuário logado (RPC idempotente) e devolve o papel.
 * Código de convite correto no cadastro => mentor; caso contrário => aluno.
 * O primeiro usuário da plataforma vira admin master.
 */
export function useRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["role", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const inviteCode =
        typeof window !== "undefined"
          ? (sessionStorage.getItem(INVITE_CODE_STORAGE_KEY) ?? "")
          : "";
      const { data, error } = await supabase.rpc("bootstrap_current_user", {
        _full_name: "",
        _invite_code: inviteCode,
      });
      if (error) throw error;
      if (typeof window !== "undefined") sessionStorage.removeItem(INVITE_CODE_STORAGE_KEY);
      return data as AppRole;
    },
  });
}

export function isStaff(role: AppRole | undefined) {
  return role === "super_admin" || role === "mentor";
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
