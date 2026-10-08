import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABELS } from "@/lib/api";
import { Moon, Sun, GraduationCap, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-logo">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-xl font-bold tracking-tight">Makandal</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-ochre font-bold">Travail social</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            className="grid place-items-center w-9 h-9 rounded-lg border border-border hover:bg-secondary transition-colors"
            aria-label="Basculer le thème"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && user.role ? (
            <>
              {user.role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} data-testid="nav-admin" className="hidden sm:inline-flex gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Admin
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/tableau-de-bord")} data-testid="nav-dashboard" className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Mon espace</span>
              </Button>
              <div className="hidden md:flex flex-col items-end leading-tight ml-1">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ROLE_LABELS[user.role]}</span>
              </div>
              <button onClick={onLogout} data-testid="nav-logout" className="grid place-items-center w-9 h-9 rounded-lg border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors" aria-label="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")} data-testid="nav-login">Connexion</Button>
          )}
        </div>
      </div>
    </header>
  );
}
