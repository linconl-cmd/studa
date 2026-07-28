import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  House,
  Users,
  FolderOpen,
  FilePlus2,
  ChartNoAxesColumn,
  BookOpen,
  ListChecks,
  Loader2,
} from "lucide-react";
import { Sidebar, type NavItem } from "@/components/mentoria/Sidebar";
import { MentorDashboard } from "@/components/mentoria/MentorDashboard";
import { StudentDashboard } from "@/components/mentoria/StudentDashboard";
import { useProfile, useRole, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const mentorNav: NavItem[] = [
  { label: "Home", icon: House },
  { label: "Meus Alunos", icon: Users },
  { label: "Gerenciador de Conteúdo", icon: FolderOpen },
  { label: "Criação de Simulados", icon: FilePlus2 },
  { label: "Análise de Progresso", icon: ChartNoAxesColumn },
];

const studentNav: NavItem[] = [
  { label: "Home", icon: House },
  { label: "Meus Estudos", icon: BookOpen },
  { label: "Simulados", icon: ListChecks },
  { label: "Meu Progresso", icon: ChartNoAxesColumn },
];

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Guerreiros Mentoria" },
      {
        name: "description",
        content:
          "Painel da mentoria: mentores acompanham alunos e métricas; alunos registram estudos e respondem simulados.",
      },
      { property: "og:title", content: "Painel — Guerreiros Mentoria" },
      {
        property: "og:description",
        content: "Acompanhe estudos, simulados e desempenho na Guerreiros Mentoria.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const role = useRole(user?.id);
  const profile = useProfile(user?.id);
  const [active, setActive] = useState("Home");

  const isMentor = role.data === "admin_mentor";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user || role.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const nome = profile.data?.full_name || user.email || "Usuário";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar
        items={isMentor ? mentorNav : studentNav}
        active={active}
        onSelect={setActive}
        userName={nome}
        userRole={isMentor ? "Mentor · Administrador" : "Aluno"}
        onSignOut={handleSignOut}
      />

      <main className="min-w-0 flex-1 px-4 py-6 pt-20 sm:px-8 lg:pt-8">
        <header className="mb-6">
          <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
            Olá, {nome.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {isMentor
              ? "Visão geral da mentoria — todos os alunos e matérias"
              : "Seu painel pessoal de estudos"}
          </p>
        </header>

        {isMentor ? <MentorDashboard /> : <StudentDashboard userId={user.id} />}
      </main>
    </div>
  );
}
