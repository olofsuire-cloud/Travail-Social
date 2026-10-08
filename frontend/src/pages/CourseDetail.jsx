import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, axisStyle, formatApiError, ROLE_LABELS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, FileText, PlayCircle, Pencil, Plus, Trash2, Save, MessageSquare, Send, GraduationCap, CheckCircle2, Clock } from "lucide-react";

export default function CourseDetail() {
  const { code } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const canEdit = user && (user.role === "admin" || (user.role === "enseignant" && (user.course_codes || []).includes(code)));
  const isStudent = user?.role === "etudiant";

  const load = () => {
    api.get(`/courses/${encodeURIComponent(code)}`).then((r) => setCourse(r.data)).catch(() => toast.error("Cours introuvable"));
    api.get(`/courses/${encodeURIComponent(code)}/progress`).then((r) => setCompleted(r.data.completed)).catch(() => {});
  };
  useEffect(() => { load(); }, [code]);

  const toggleSeance = async (num, checked) => {
    setCompleted((prev) => checked ? [...prev, num] : prev.filter((n) => n !== num));
    try { await api.put(`/courses/${encodeURIComponent(code)}/progress`, { seance_num: num, completed: checked }); }
    catch { toast.error("Échec de l'enregistrement"); }
  };

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(course))); setEditing(true); };
  const saveEdit = async () => {
    try {
      const { data } = await api.put(`/courses/${encodeURIComponent(code)}`, {
        title: draft.title, prof: draft.prof, credits: draft.credits, schedule: draft.schedule,
        prereq: draft.prereq, desc: draft.desc, objectifs: draft.objectifs, seances: draft.seances,
      });
      setCourse(data); setEditing(false); toast.success("Cours mis à jour");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!course) return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Chargement…</div>;

  const total = (course.seances || []).length;
  const pct = total ? Math.round((completed.length / total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="back-link">
        <ArrowLeft className="w-4 h-4" /> Retour au catalogue
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${axisStyle(course.axis)}`}>{course.axis}</span>
            <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
            <span className="text-xs text-muted-foreground">· {course.year}</span>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={startEdit} data-testid="edit-course-btn" className="gap-1.5"><Pencil className="w-4 h-4" /> Modifier le contenu</Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="cancel-edit">Annuler</Button>
              <Button size="sm" onClick={saveEdit} data-testid="save-course-btn" className="gap-1.5"><Save className="w-4 h-4" /> Enregistrer</Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="edit-title" className="font-serif text-xl" />
            <div className="grid sm:grid-cols-3 gap-2">
              <Input value={draft.prof} onChange={(e) => setDraft({ ...draft, prof: e.target.value })} placeholder="Enseignant" data-testid="edit-prof" />
              <Input value={draft.credits} onChange={(e) => setDraft({ ...draft, credits: e.target.value })} placeholder="Crédits" />
              <Input value={draft.schedule} onChange={(e) => setDraft({ ...draft, schedule: e.target.value })} placeholder="Horaire" />
            </div>
            <Textarea value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} rows={3} data-testid="edit-desc" />
          </div>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold tracking-tight">{course.title}</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-3xl">{course.desc}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> {course.prof}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {course.schedule}</span>
              <span className="text-muted-foreground">{course.credits}</span>
              {course.prereq && <span className="text-muted-foreground">Préalable : {course.prereq}</span>}
            </div>
          </>
        )}

        {isStudent && !editing && total > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium">Ma progression</span>
              <span className="text-muted-foreground" data-testid="progress-pct">{pct}% · {completed.length}/{total} séances</span>
            </div>
            <Progress value={pct} data-testid="progress-bar" />
          </div>
        )}
      </div>

      {/* Objectifs */}
      {course.objectifs?.length > 0 && !editing && (
        <div className="mt-6 rounded-2xl border border-border bg-background-paper p-6">
          <h2 className="font-serif text-xl font-semibold">Objectifs d'apprentissage</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2">
            {course.objectifs.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" /> {o}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="seances" className="mt-8">
        <TabsList data-testid="course-tabs">
          <TabsTrigger value="seances" data-testid="tab-seances">Séances</TabsTrigger>
          <TabsTrigger value="devoir" data-testid="tab-devoir">Devoir</TabsTrigger>
          <TabsTrigger value="forum" data-testid="tab-forum">Forum</TabsTrigger>
        </TabsList>

        {/* Séances */}
        <TabsContent value="seances" className="mt-4">
          {editing ? (
            <SeanceEditor draft={draft} setDraft={setDraft} />
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {(course.seances || []).map((s) => (
                <AccordionItem key={s.num} value={s.num} className="rounded-xl border border-border bg-card px-4" data-testid={`seance-${s.num}`}>
                  <div className="flex items-center gap-3">
                    {isStudent && (
                      <input type="checkbox" checked={completed.includes(s.num)} onChange={(e) => toggleSeance(s.num, e.target.checked)}
                        data-testid={`seance-check-${s.num}`} className="w-4 h-4 accent-primary shrink-0" onClick={(e) => e.stopPropagation()} />
                    )}
                    <AccordionTrigger className="flex-1 hover:no-underline py-4">
                      <span className="flex items-center gap-3 text-left">
                        <span className="font-mono text-xs text-ochre font-semibold">{s.num}</span>
                        <span className="font-medium">{s.titre}</span>
                      </span>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(s.lectures || []).map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground" data-testid={`seance-doc-${s.num}-${i}`}>
                          <FileText className="w-3.5 h-3.5" /> {l.label}
                        </span>
                      ))}
                      {s.youtube && (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          <PlayCircle className="w-3.5 h-3.5" /> Vidéo
                        </span>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* Devoir */}
        <TabsContent value="devoir" className="mt-4">
          <DevoirPanel course={course} code={code} user={user} canEdit={canEdit} isStudent={isStudent} />
        </TabsContent>

        {/* Forum */}
        <TabsContent value="forum" className="mt-4">
          <ForumPanel code={code} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeanceEditor({ draft, setDraft }) {
  const update = (idx, field, val) => {
    const seances = draft.seances.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    setDraft({ ...draft, seances });
  };
  const add = () => {
    const num = String((draft.seances?.length || 0) + 1).padStart(2, "0");
    setDraft({ ...draft, seances: [...(draft.seances || []), { num, titre: "Nouvelle séance", desc: "", lectures: [], youtube: null }] });
  };
  const remove = (idx) => setDraft({ ...draft, seances: draft.seances.filter((_, i) => i !== idx) });
  return (
    <div className="space-y-3">
      {(draft.seances || []).map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2" data-testid={`edit-seance-${i}`}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ochre font-semibold">{s.num}</span>
            <Input value={s.titre} onChange={(e) => update(i, "titre", e.target.value)} className="flex-1" data-testid={`edit-seance-title-${i}`} />
            <Button size="icon" variant="ghost" onClick={() => remove(i)} data-testid={`delete-seance-${i}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
          <Textarea value={s.desc} onChange={(e) => update(i, "desc", e.target.value)} rows={2} placeholder="Description de la séance" />
        </div>
      ))}
      <Button variant="outline" onClick={add} className="gap-1.5" data-testid="add-seance-btn"><Plus className="w-4 h-4" /> Ajouter une séance</Button>
    </div>
  );
}

function DevoirPanel({ course, code, user, canEdit, isStudent }) {
  const [subs, setSubs] = useState([]);
  const [text, setText] = useState("");
  const load = () => api.get(`/courses/${encodeURIComponent(code)}/submissions`).then((r) => setSubs(r.data)).catch(() => {});
  useEffect(() => { load(); }, [code]);

  const submit = async () => {
    if (!text.trim()) return;
    try { await api.post(`/courses/${encodeURIComponent(code)}/submissions`, { text }); setText(""); load(); toast.success("Devoir soumis"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const grade = async (id) => {
    const g = prompt("Note (ex: 18/20) :");
    if (g == null) return;
    const fb = prompt("Commentaire (optionnel) :") || "";
    try { await api.put(`/submissions/${id}/grade`, { grade: g, feedback: fb }); load(); toast.success("Note enregistrée"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const d = course.devoir;
  return (
    <div className="space-y-6">
      {d && (
        <div className="rounded-2xl border border-border bg-background-paper p-6">
          <h3 className="font-serif text-xl font-semibold">{d.titre}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {d.echeance && <span>Échéance : {d.echeance}</span>}
            {d.ponderation && <span>Pondération : {d.ponderation}</span>}
            {d.format && <span>Format : {d.format}</span>}
          </div>
        </div>
      )}

      {isStudent && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h4 className="font-semibold">Soumettre mon devoir</h4>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Rédigez ou collez votre travail ici…" className="mt-3" data-testid="submission-text" />
          <Button onClick={submit} className="mt-3 gap-1.5" data-testid="submit-devoir-btn"><Send className="w-4 h-4" /> Soumettre</Button>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">{canEdit ? "Soumissions des étudiants" : "Mes soumissions"} ({subs.length})</h4>
        {subs.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4" data-testid={`submission-${s.id}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{s.student_name}</span>
              {s.grade ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sage/15 text-sage" data-testid={`grade-${s.id}`}>{s.grade}</span>
                : <span className="text-xs text-muted-foreground">Non noté</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{s.text}</p>
            {s.feedback && <p className="mt-2 text-xs italic text-ochre">Retour : {s.feedback}</p>}
            {canEdit && <Button size="sm" variant="outline" className="mt-3" onClick={() => grade(s.id)} data-testid={`grade-btn-${s.id}`}>Noter</Button>}
          </div>
        ))}
        {subs.length === 0 && <p className="text-sm text-muted-foreground">Aucune soumission pour le moment.</p>}
      </div>
    </div>
  );
}

function ForumPanel({ code }) {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const load = () => api.get(`/courses/${encodeURIComponent(code)}/forum`).then((r) => setPosts(r.data)).catch(() => {});
  useEffect(() => { load(); }, [code]);
  const post = async () => {
    if (!text.trim()) return;
    try { await api.post(`/courses/${encodeURIComponent(code)}/forum`, { text }); setText(""); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && post()} placeholder="Posez une question ou partagez une idée…" data-testid="forum-input" />
          <Button onClick={post} className="gap-1.5 shrink-0" data-testid="forum-post-btn"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4" data-testid={`forum-post-${p.id}`}>
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-primary/10 text-primary"><MessageSquare className="w-3.5 h-3.5" /></span>
              <span className="font-medium text-sm">{p.author_name}</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{ROLE_LABELS[p.role]}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{p.text}</p>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted-foreground">Aucun message. Lancez la discussion !</p>}
      </div>
    </div>
  );
}
