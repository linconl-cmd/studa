import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Subject = { id: string; title: string; description: string | null };
export type Topic = {
  id: string;
  subject_id: string;
  title: string;
  exercise_url: string | null;
};

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, title, description")
        .order("created_at");
      if (error) throw error;
      return data as Subject[];
    },
  });
}

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, subject_id, title, exercise_url")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

export type SessionRow = {
  id: string;
  user_id: string;
  topic_id: string;
  study_time_minutes: number;
  date: string;
  status: string;
  created_at: string;
};

export function useStudySessions(userId?: string) {
  return useQuery({
    queryKey: ["study_sessions", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("study_sessions")
        .select("id, user_id, topic_id, study_time_minutes, date, status, created_at")
        .order("date", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });
}

/* ---------------- resultados de exercícios externos ---------------- */

export type ResultRow = {
  id: string;
  user_id: string;
  topic_id: string;
  correct_count: number;
  wrong_count: number;
  date: string;
  created_at: string;
};

export function useExerciseResults(userId?: string) {
  return useQuery({
    queryKey: ["exercise_results", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("exercise_results")
        .select("id, user_id, topic_id, correct_count, wrong_count, date, created_at")
        .order("date", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ResultRow[];
    },
  });
}

export function useLogResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      topic_id: string;
      correct_count: number;
      wrong_count: number;
      date: string;
    }) => {
      const { error } = await supabase.from("exercise_results").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercise_results"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
}

export function useDeleteResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercise_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercise_results"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
}

/* ---------------- ranking ---------------- */

export type RankingRow = {
  user_id: string;
  full_name: string;
  correct_count: number;
  wrong_count: number;
  accuracy: number;
  study_minutes: number;
};

export function useRanking(topicId?: string) {
  return useQuery({
    queryKey: ["ranking", topicId ?? "geral"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ranking_overview", {
        _topic_id: topicId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (rolesError) throw rolesError;
      const roleOf = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleOf.get(p.id) ?? "student" }));
    },
  });
}

/* ---------------- mutations de conteúdo ---------------- */

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { error } = await supabase.from("subjects").insert({
        title: input.title,
        description: input.description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject_id: string;
      title: string;
      exercise_url?: string | null;
    }) => {
      const { error } = await supabase.from("topics").insert({
        subject_id: input.subject_id,
        title: input.title,
        exercise_url: input.exercise_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useUpdateTopicUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; exercise_url: string | null }) => {
      const { error } = await supabase
        .from("topics")
        .update({ exercise_url: input.exercise_url })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useLogStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      topic_id: string;
      study_time_minutes: number;
      date: string;
    }) => {
      const { error } = await supabase.from("study_sessions").insert({
        ...input,
        status: "completed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
}

/* ---------------- admin master ---------------- */

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: "super_admin" | "mentor" | "student" }) => {
      const { error } = await supabase.rpc("set_user_role", {
        _user_id: input.userId,
        _role: input.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managed_users"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
