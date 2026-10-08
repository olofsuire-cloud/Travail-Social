import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, axisStyle, ROLE_LABELS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, GraduationCap, ShieldCheck, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => { api.get("/courses").then((r) => setCourses(r.data)).catch(() => {}); }, []);

  const myCourses = useMemo(() => {
    if (user?.role === "admin") return courses;
    const codes = new Set(user?.course_codes || []);
    return courses.filter((c) => codes.has(c.code));
  }, [courses, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-sky-950 via-slate-900 to-amber-950 text-white p-6 sm:p-8">
        <span className="text-xs uppercase tracking-[0.18em] font-bold text-amber-300">{ROLE_LABELS[user?.role]}</span>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold">Bonjour, {user?.name}</h1>
        <p className="mt-2 text-slate-300 text-sm">
          {user?.role === "admin" && "Vous avez accès à l'ensemble du programme et à la gestion des utilisateurs."}
          {user?.role === "enseignant" && "Voici les cours qui vous sont assignés. Vous pouvez en modifier le contenu."}
          {user?.role === "etudiant" && "Voici vos cours inscrits. Suivez votre progression et rendez vos devoirs."}
        </p>
        {user?.role === "admin" && (
          <Link to="/admin" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg" data-testid="go-admin">
            <ShieldCheck className="w-4 h-4" /> Console d'administration <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <h2 className="mt-10 font-serif text-2xl font-semibold flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" /> {user?.role === "admin" ? "Tous les cours" : "Mes cours"} ({myCourses.length})
      </h2>

      {myCourses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground" data-testid="no-courses">
          <GraduationCap className="w-10 h-10 mx-auto" />
          <p className="mt-3">Aucun cours ne vous est encore assigné. Contactez l'administrateur.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCourses.map((c) => (
            <Link key={c.code} to={`/cours/${encodeURIComponent(c.code)}`} data-testid={`my-course-${c.code}`}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 flex flex-col">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${axisStyle(c.axis)}`}>{c.axis}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
              </div>
              <h3 className="mt-3 font-serif text-xl font-semibold group-hover:text-primary transition-colors">{c.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.year} · {c.credits}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
