import { createFileRoute } from "@tanstack/react-router";
import { Search, Bell } from "lucide-react";
import { Sidebar } from "@/components/mentoria/Sidebar";
import { KpiCards, Assiduidade, MateriaPanel } from "@/components/mentoria/Dashboard";
import { RightPanels } from "@/components/mentoria/RightPanels";
import { ContentStudio } from "@/components/mentoria/ContentStudio";


const title = "Guerreiros Mentoria — Painel do Mentor";
const description =
  "Plataforma de mentoria de estudos: acompanhe alunos, progresso por matéria, simulados e assiduidade em um painel único.";

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

function Index() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-6 pt-20 sm:px-8 lg:pt-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
              Olá, Prof. Rafael 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão geral da mentoria — semana de 27 de julho
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-soft sm:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar aluno..."
                className="w-36 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              aria-label="Notificações"
              className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-soft"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-5 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <KpiCards />
            <Assiduidade />
            <MateriaPanel />
            <ContentStudio />

          </div>
          <RightPanels />
        </div>
      </main>
    </div>
  );
}
