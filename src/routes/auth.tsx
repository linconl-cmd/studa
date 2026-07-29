import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BrandMark } from "@/components/BrandProvider";
import { supabase } from "@/integrations/supabase/client";
import { INVITE_CODE_STORAGE_KEY } from "@/hooks/useSession";
import { lovable } from "@/integrations/lovable/index";

const title = "Entrar — Guerreiros Mentoria";
const description =
  "Acesse a plataforma Guerreiros Mentoria: mentores acompanham turmas e alunos registram estudos, simulados e desempenho.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const input =
    "w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const fullName = name.trim();
        if (!fullName) throw new Error("Informe seu nome completo.");
        localStorage.setItem(INVITE_CODE_STORAGE_KEY, inviteCode.trim());
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, invite_code: inviteCode.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Cadastro criado! Confirme seu e-mail para entrar.");
          return;
        }
        await supabase.rpc("bootstrap_current_user", {
          _full_name: fullName,
          _invite_code: inviteCode.trim(),
        });
        localStorage.removeItem(INVITE_CODE_STORAGE_KEY);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/painel" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }


  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/painel" });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex max-w-5xl justify-end">
        <AppHeader />
      </div>
      <div className="mx-auto mt-6 w-full max-w-md rounded-3xl bg-card p-8 shadow-soft">
        <BrandMark />


        <div className="mt-6 flex gap-2 rounded-full bg-muted p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className={input}
              required
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {mode === "signup" && (
            <input
              className={input}
              placeholder="Código de convite (opcional)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          )}
          <input
            className={input}
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={input}
            type="password"
            required
            minLength={6}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Continuar com Google
        </button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Com um código de convite válido você entra como mentor; sem código, como aluno.
        </p>
      </div>
    </main>
  );
}
