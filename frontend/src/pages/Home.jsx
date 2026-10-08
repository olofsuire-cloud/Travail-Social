import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, axisStyle } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, GraduationCap, Users, Search, ArrowRight, Scale, HeartHandshake, ShieldCheck } from "lucide-react";

const YEARS = ["Première année", "Deuxième année", "Troisième année", "Quatrième année", "Cours optionnels", "Séminaires", "Stage terrain — 3ᵉ et 4ᵉ année"];

export default function Home() {
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [courses, setCourses] = useState([]);
  const [year, setYear] = useState("Toutes");
  const [axis, setAxis] = useState("Tous les axes");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/program").then((r) => setProgram(r.data)).catch(() => {});
    if (user && user.role) {
      api.get("/courses").then((r) => setCourses(r.data)).catch(() => {});
    }
  }, [user]);

  const axes = program?.axes || [];
  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (year !== "Toutes" && c.year !== year) return false;
      if (axis !== "Tous les axes" && c.axis !== axis) return false;
      if (q && !(`${c.title} ${c.code} ${c.prof}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [courses, year, axis, q]);

  const presentYears = YEARS.filter((y) => courses.some((c) => c.year === y));

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-950 via-slate-900 to-amber-950 text-white p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-bold text-amber-300">
              <GraduationCap className="w-4 h-4" /> Faculté des sciences humaines & sociales
            </span>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Formation universitaire en <span className="text-sky-300">travail social</span>
            </h1>
            <p className="mt-5 text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {program?.meta?.desc || "Un cursus de licence organisé en cinq axes pédagogiques, de la théorie à l'intervention sur le terrain."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user && user.role ? (
                <a href="#catalogue"><Button size="lg" data-testid="hero-explore" className="gap-2">Explorer le programme <ArrowRight className="w-4 h-4" /></Button></a>
              ) : (
                <Link to="/login"><Button size="lg" data-testid="hero-login" className="gap-2">Accès portail <ArrowRight className="w-4 h-4" /></Button></Link>
              )}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {[["4", "Années d'études"], ["5", "Axes d'intervention"], ["47", "Cours & séminaires"]].map(([n, l]) => (
                <div key={l}>
                  <div className="font-serif text-3xl font-bold text-amber-300">{n}</div>
                  <div className="text-xs text-slate-400 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-32 -top-20 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        </div>
      </section>

      {/* Axes / objectifs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Objectifs du programme</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(program?.meta?.objectifs || []).map((o, i) => {
            const icons = [Scale, HeartHandshake, BookOpen, ShieldCheck];
            const Icon = icons[i % icons.length];
            return (
              <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary"><Icon className="w-5 h-5" /></span>
                <p className="text-sm leading-relaxed text-card-foreground">{o}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.18em] font-bold text-ochre">Catalogue</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Cours du programme</h2>
          </div>
          {user && user.role && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un cours…" className="pl-9" data-testid="course-search" />
            </div>
          )}
        </div>

        {!user || !user.role ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-background-paper p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Connectez-vous pour consulter le détail des 47 cours, leurs séances et ressources.</p>
            <Link to="/login"><Button className="mt-4" data-testid="catalogue-login">Se connecter</Button></Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Toutes", ...presentYears].map((y) => (
                <button key={y} onClick={() => setYear(y)} data-testid={`year-filter-${y}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${year === y ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                  {y}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Tous les axes", ...axes].map((a) => (
                <button key={a} onClick={() => setAxis(a)} data-testid={`axis-filter-${a}`}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${axis === a ? "bg-ochre text-white border-ochre" : "border-border hover:bg-secondary text-muted-foreground"}`}>
                  {a}
                </button>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((c) => (
                <Link key={c.code} to={`/cours/${encodeURIComponent(c.code)}`} data-testid={`course-card-${c.code}`}
                  className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${axisStyle(c.axis)}`}>{c.axis}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-semibold leading-snug group-hover:text-primary transition-colors">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">{c.desc}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span>{c.year}</span>
                    <span className="font-medium">{c.credits}</span>
                  </div>
                </Link>
              ))}
            </div>
            {filtered.length === 0 && <p className="mt-10 text-center text-muted-foreground">Aucun cours ne correspond à votre recherche.</p>}
          </>
        )}
      </section>
    </div>
  );
}
