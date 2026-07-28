import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Subject = { id: string; title: string; description: string | null };
export type Topic = { id: string; subject_id: string; title: string };
export type QuestionForStudent = {
  id: string;
  subject_id: string;
  topic_id: string | null;
  statement: string;
  options: string[];
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
        .select("id, subject_id, title")
        .order("created_at");
      if (error) throw error;
      return data as Topic[];
    },
  });
}

export function useQuestions(subjectId?: string) {
  return useQuery({
    queryKey: ["questions", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, subject_id, topic_id, statement, options")
        .eq("subject_id", subjectId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      })) as QuestionForStudent[];
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
};

export function useStudySessions(userId?: string) {
  return useQuery({
    queryKey: ["study_sessions", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("study_sessions")
        .select("id, user_id, topic_id, study_time_minutes, date, status")
        .order("date", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });
}

export type AnswerRow = {
  id: string;
  user_id: string;
  question_id: string;
  is_correct: boolean;
  answered_at: string;
};

export function useAnswers(userId?: string) {
  return useQuery({
    queryKey: ["student_answers", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("student_answers")
        .select("id, user_id, question_id, is_correct, answered_at")
        .order("answered_at", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AnswerRow[];
    },
  });
}

export function useAllQuestionsMeta() {
  return useQuery({
    queryKey: ["questions_meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, subject_id, topic_id");
      if (error) throw error;
      return (data ?? []) as { id: string; subject_id: string; topic_id: string | null }[];
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

/* ---------------- mutations ---------------- */

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
    mutationFn: async (input: { subject_id: string; title: string }) => {
      const { error } = await supabase.from("topics").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject_id: string;
      topic_id: string | null;
      statement: string;
      options: string[];
      correct_answer: string;
    }) => {
      const { error } = await supabase.from("questions").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["questions_meta"] });
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_sessions"] }),
  });
}

export function useSubmitAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; selected_answer: string }) => {
      const { data, error } = await supabase.rpc("submit_answer", {
        _question_id: input.question_id,
        _selected_answer: input.selected_answer,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student_answers"] }),
  });
}
