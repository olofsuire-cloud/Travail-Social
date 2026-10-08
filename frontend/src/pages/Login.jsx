import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.role) return <Navigate to="/tableau-de-bord" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/tableau-de-bord");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-sky-950 via-slate-900 to-amber-950 text-white relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-bold text-amber-300">
            <GraduationCap className="w-4 h-4" /> Portail universitaire
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-serif text-5xl font-bold leading-tight">Programme de Travail social</h1>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Accédez à vos cours, séances, ressources et travaux. Plateforme pédagogique de la Faculté des sciences humaines et sociales.
          </p>
        </div>
        <div className="relative z-10 text-sm text-slate-400">Makandal · Licence en travail social</div>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6 animate-fade-up" data-testid="login-form">
          <div>
            <h2 className="font-serif text-3xl font-bold">Connexion</h2>
            <p className="text-muted-foreground text-sm mt-1">Entrez vos identifiants pour continuer.</p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2" data-testid="login-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" placeholder="vous@exemple.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" placeholder="••••••••" />
          </div>

          <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Pas de compte ? Contactez l'administrateur du programme pour obtenir vos accès.
          </p>
        </form>
      </div>
    </div>
  );
}
