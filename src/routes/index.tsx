import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, LineChart, ListChecks, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { BrandMark, useBrandingValue } from "@/components/BrandProvider";

const title = "Guerreiros Mentoria — Plataforma de Mentoria de Estudos";
const description =
  "Plataforma de mentoria de estudos: mentores acompanham alunos, matérias e simulados; alunos registram tempo de estudo e medem seu desempenho.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

const destaques = [
  { icon: Users, t: "Turmas e Alunos", d: "Acompanhe cada aluno e o engajamento da turma." },
  { icon: ListChecks, t: "Simulados", d: "Crie questões e corrija automaticamente." },
  { icon: LineChart, t: "Progresso", d: "Tempo de estudo, acertos e constância em tempo real." },
];

function Index() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/painel", replace: true });
  }, [user, loading, navigate]);

  const brand = useBrandingValue();

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <BrandMark size="sm" />
        <AppHeader />
      </div>

      <div className="mx-auto mt-14 max-w-3xl text-center">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={`Logotipo ${brand.platform_name}`}
            className="mx-auto h-14 w-14 rounded-2xl object-cover"
          />
        ) : (
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
        )}
        <h1 className="mt-6 font-display text-4xl font-bold sm:text-5xl">{brand.platform_name}</h1>
        <p className="mt-4 text-muted-foreground">{description}</p>
        <Link
          to="/auth"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Entrar na plataforma
        </Link>


        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {destaques.map((d) => (
            <div key={d.t} className="rounded-3xl bg-card p-6 text-left shadow-soft">
              <d.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-sm font-bold">{d.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.d}</p>
            </div>
          ))}
        </div>

        <footer className="mt-12 border-t border-border/60 pt-6">
          <PoweredByFooter />
        </footer>
      </div>
    </main>

  );
}
