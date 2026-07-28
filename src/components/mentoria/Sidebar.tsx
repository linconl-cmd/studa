import { useState } from "react";
import {
  House,
  Users,
  BookOpen,
  ClipboardList,
  ChartNoAxesColumn,
  CalendarDays,
  MessageSquareHeart,
  GraduationCap,
  Menu,
} from "lucide-react";

const items = [
  { label: "Home", icon: House },
  { label: "Turmas e Alunos", icon: Users },
  { label: "Conteúdos da Mentoria", icon: BookOpen },
  { label: "Simulados e Exercícios", icon: ClipboardList },
  { label: "Acompanhamento de Progresso", icon: ChartNoAxesColumn },
  { label: "Calendário de Mentoria", icon: CalendarDays },
  { label: "Relatórios e Feedback", icon: MessageSquareHeart },
];

export function Sidebar() {
  const [active, setActive] = useState("Home");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alternar navegação"
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl bg-sidebar text-sidebar-foreground shadow-soft lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-5 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex min-w-0 items-center gap-3 px-1 pt-10 lg:pt-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold leading-tight">
              Guerreiros
            </p>
            <p className="truncate text-xs text-muted-foreground">Mentoria de Estudos</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = active === item.label;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setActive(item.label);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-secondary p-4">
          <p className="text-sm font-semibold text-secondary-foreground">Prof. Rafael Lima</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Mentor responsável</p>
        </div>
      </aside>
    </>
  );
}
