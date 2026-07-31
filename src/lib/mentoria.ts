import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/metrics";

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
  activity_id: string | null;
};

export function useExerciseResults(userId?: string) {
  return useQuery({
    queryKey: ["exercise_results", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("exercise_results")
        .select("id, user_id, topic_id, correct_count, wrong_count, date, created_at, activity_id")
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
      activity_id?: string | null;
    }) => {
      const { error } = await supabase.from("exercise_results").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercise_results"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
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
        supabase.from("profiles").select("id, full_name, email, created_at, teacher_id"),
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

/* ---------------- atividades por tópico ---------------- */

export type Activity = {
  id: string;
  topic_id: string;
  title: string;
  exercise_url: string | null;
  due_date: string;
  position: number;
  created_at: string;
};

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, topic_id, title, exercise_url, due_date, position, created_at")
        .order("due_date", { ascending: false })
        .order("position");
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topic_id: string;
      title: string;
      exercise_url?: string | null;
      due_date: string;
    }) => {
      const { error } = await supabase.from("activities").insert({
        topic_id: input.topic_id,
        title: input.title,
        exercise_url: input.exercise_url?.trim() || null,
        due_date: input.due_date,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

/**
 * Registro automático de frequência: ao interagir com a plataforma,
 * garante uma marcação de presença do dia (0 min, status "auto").
 */
export function useAutoAttendance(userId?: string, topicId?: string) {
  const qc = useQueryClient();
  const sessions = useStudySessions(userId);
  const done = useRef(false);

  useEffect(() => {
    if (!userId || !topicId || sessions.isLoading || done.current) return;
    const today = todayISO();
    if ((sessions.data ?? []).some((s) => s.date === today)) {
      done.current = true;
      return;
    }
    done.current = true;
    void supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        topic_id: topicId,
        study_time_minutes: 0,
        date: today,
        status: "auto",
      })
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["study_sessions"] });
      });
  }, [userId, topicId, sessions.isLoading, sessions.data, qc]);
}

/* ---------------- vínculo aluno x professor ---------------- */

export type Mentor = { id: string; full_name: string };

export function useMentors() {
  return useQuery({
    queryKey: ["mentors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentors");
      if (error) throw error;
      return (data ?? []) as Mentor[];
    },
  });
}

export function useSetStudentTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; teacherId: string | null }) => {
      const { error } = await supabase.rpc("set_student_teacher", {
        _student_id: input.studentId,
        _teacher_id: input.teacherId as unknown as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managed_users"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
}

/** Validação estrita: inteiro >= 0. Retorna null quando inválido. */
export function parseCount(value: string): number | null {
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
