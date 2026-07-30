import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  House,
  Users,
  FolderOpen,
  Trophy,
  BookOpen,
  ShieldCheck,
  Palette,
  Loader2,
} from "lucide-react";
import { Sidebar, type NavItem } from "@/components/mentoria/Sidebar";
import { MentorDashboard } from "@/components/mentoria/MentorDashboard";
import { StudentDashboard } from "@/components/mentoria/StudentDashboard";
import { AdminUsers } from "@/components/mentoria/AdminUsers";
import { BrandSettings } from "@/components/mentoria/BrandSettings";
import { MyProfile } from "@/components/mentoria/MyProfile";
import { AppHeader } from "@/components/AppHeader";
import { isStaff, useProfile, useRole, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const mentorNav: NavItem[] = [
  { label: "Home", icon: House },
  { label: "Meus Alunos", icon: Users },
  { label: "Gerenciador de Conteúdo", icon: FolderOpen },
  { label: "Ranking", icon: Trophy },
];

const studentNav: NavItem[] = [
  { label: "Home", icon: House },
  { label: "Meus Estudos", icon: BookOpen },
  { label: "Ranking", icon: Trophy },
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

  const isSuperAdmin = role.data === "super_admin";
  const isMentor = isStaff(role.data);

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

  const nome = profile.data?.full_name?.trim() || "Usuário";
  const roleLabel = isSuperAdmin ? "Admin Master" : isMentor ? "Mentor" : "Aluno";
  const nav: NavItem[] = isMentor
    ? [
        ...mentorNav,
        { label: "Configurações da Marca", icon: Palette },
        ...(isSuperAdmin ? [{ label: "Gerenciar Usuários", icon: ShieldCheck }] : []),
      ]
    : studentNav;
  const showAdminUsers = isSuperAdmin && active === "Gerenciar Usuários";
  const showBranding = isMentor && active === "Configurações da Marca";
  const showProfile = active === "Meu Perfil" || (!isMentor && active === "Configurações da Marca");

  const subtitle = showProfile
    ? "Seus dados pessoais e foto de perfil"
    : showBranding
      ? "Personalize nome, logotipo e cores da sua plataforma"
      : showAdminUsers
        ? "Todos os cadastros da plataforma — alunos, mentores e administradores"
        : active === "Ranking"
          ? "Classificação dos alunos e relatórios analíticos"
          : isMentor
            ? "Visão geral da mentoria — todos os alunos e matérias"
            : "Seu painel pessoal de estudos";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar
        items={nav}
        active={active}
        onSelect={setActive}
        userName={nome}
        userRole={roleLabel}
        onSignOut={handleSignOut}
      />

      <main className="min-w-0 flex-1 px-4 py-6 pt-20 sm:px-8 lg:pt-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <header>
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
              {active === "Home" ? `Olá, ${nome.split(" ")[0]} 👋` : active}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </header>
          <AppHeader onSelectSection={setActive} />
        </div>

        {showProfile ? (
          <MyProfile userId={user.id} roleLabel={roleLabel} />
        ) : showBranding ? (
          <BrandSettings />
        ) : showAdminUsers ? (
          <AdminUsers currentUserId={user.id} />
        ) : isMentor ? (
          <MentorDashboard section={active} />
        ) : (
          <StudentDashboard userId={user.id} section={active} onSelectSection={setActive} />
        )}
      </main>
    </div>
  );
}
