import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (roleError) throw roleError;
    if (!isSuperAdmin) throw new Error("Apenas o admin master pode remover contas.");
    if (data.userId === userId) throw new Error("Você não pode remover a própria conta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("student_answers").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("study_sessions").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;

    return { ok: true };
  });
