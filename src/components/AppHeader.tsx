import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun, LogOut, User as UserIcon, Settings, LogIn } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { useProfile, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppHeader({ onSelectSection }: { onSelectSection?: (section: string) => void }) {
  const { theme, toggle } = useTheme();
  const { user } = useSession();
  const profile = useProfile(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const nome = profile.data?.full_name || user?.email || "Usuário";
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={toggle}
        aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menu do usuário"
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground"
          >
            {profile.data?.avatar_url ? (
              <img
                src={profile.data.avatar_url}
                alt={nome}
                className="h-full w-full object-cover"
              />
            ) : (
              (initials || <UserIcon className="h-4 w-4" />)
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                onSelectSection
                  ? onSelectSection("Meu Perfil")
                  : navigate({ to: "/painel" })
              }
            >
              <UserIcon className="mr-2 h-4 w-4" /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onSelectSection
                  ? onSelectSection("Configurações da Marca")
                  : navigate({ to: "/painel" })
              }
            >
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogIn className="h-4 w-4" /> Entrar
        </Link>
      )}
    </div>
  );
}
