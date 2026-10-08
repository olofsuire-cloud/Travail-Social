import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, ROLE_LABELS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, BookOpen, Pencil, Trash2, Search, ShieldCheck, GraduationCap, UserCog } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [editUser, setEditUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadUsers = () => api.get("/admin/users").then((r) => setUsers(r.data)).catch((e) => toast.error(formatApiError(e.response?.data?.detail)));
  useEffect(() => { loadUsers(); api.get("/courses").then((r) => setCourses(r.data)).catch(() => {}); }, []);

  const filtered = useMemo(() => users.filter((u) => {
    if (roleFilter !== "tous" && u.role !== roleFilter) return false;
    if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [users, q, roleFilter]);

  const counts = useMemo(() => ({
    enseignant: users.filter((u) => u.role === "enseignant").length,
    etudiant: users.filter((u) => u.role === "etudiant").length,
  }), [users]);

  const del = async (u) => {
    if (!confirm(`Supprimer ${u.name} ?`)) return;
    try { await api.delete(`/admin/users/${u.id}`); loadUsers(); toast.success("Utilisateur supprimé"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 text-ochre">
        <ShieldCheck className="w-5 h-5" />
        <span className="text-xs uppercase tracking-[0.18em] font-bold">Console d'administration</span>
      </div>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold">Gestion des utilisateurs</h1>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total comptes" value={users.length} />
        <Stat icon={GraduationCap} label="Enseignants" value={counts.enseignant} />
        <Stat icon={UserCog} label="Étudiants" value={counts.etudiant} />
        <Stat icon={BookOpen} label="Cours" value={courses.length} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" data-testid="user-search" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40" data-testid="role-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les rôles</SelectItem>
              <SelectItem value="enseignant">Enseignants</SelectItem>
              <SelectItem value="etudiant">Étudiants</SelectItem>
              <SelectItem value="admin">Administrateurs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <UserDialog open={createOpen} setOpen={setCreateOpen} courses={courses} onSaved={loadUsers}
          trigger={<Button className="gap-1.5" data-testid="add-user-btn"><UserPlus className="w-4 h-4" /> Nouvel utilisateur</Button>} />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background-paper text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3 hidden sm:table-cell">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3 hidden md:table-cell">Cours assignés</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-secondary/40" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-ochre/15 text-ochre" : u.role === "enseignant" ? "bg-primary/15 text-primary" : "bg-sage/15 text-sage"}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.role === "admin" ? "Tous" : (u.course_codes?.length || 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditUser(u)} data-testid={`edit-user-${u.id}`}><Pencil className="w-4 h-4" /></Button>
                    {u.role !== "admin" && <Button size="icon" variant="ghost" onClick={() => del(u)} data-testid={`delete-user-${u.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucun utilisateur.</p>}
      </div>

      {editUser && (
        <UserDialog open={!!editUser} setOpen={(v) => !v && setEditUser(null)} courses={courses} existing={editUser} onSaved={loadUsers} />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="w-5 h-5 text-primary" />
      <div className="mt-3 font-serif text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function UserDialog({ open, setOpen, courses, existing, onSaved, trigger }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("etudiant");
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    if (existing) {
      setName(existing.name); setEmail(existing.email); setRole(existing.role);
      setCodes(existing.course_codes || []); setPassword("");
    } else {
      setName(""); setEmail(""); setPassword(""); setRole("etudiant"); setCodes([]);
    }
  }, [existing, open]);

  const toggleCode = (code) => setCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);

  const save = async () => {
    try {
      if (existing) {
        const payload = { name, role, course_codes: codes };
        if (password) payload.password = password;
        await api.put(`/admin/users/${existing.id}`, payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await api.post("/admin/users", { name, email, password, role, course_codes: codes });
        toast.success("Utilisateur créé");
      }
      setOpen(false); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const grouped = useMemo(() => {
    const m = {};
    courses.forEach((c) => { (m[c.year] = m[c.year] || []).push(c); });
    return m;
  }, [courses]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="user-dialog">
        <DialogHeader><DialogTitle className="font-serif text-2xl">{existing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2"><Label>Nom complet</Label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="form-name" /></div>
          <div className="grid gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!existing} data-testid="form-email" /></div>
          <div className="grid gap-2">
            <Label>{existing ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe"}</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="form-password" placeholder="••••••••" />
          </div>
          <div className="grid gap-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="form-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="etudiant">Étudiant</SelectItem>
                <SelectItem value="enseignant">Enseignant</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role !== "admin" && (
            <div className="grid gap-2">
              <Label>Cours assignés ({codes.length})</Label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border p-2 space-y-2" data-testid="course-assign">
                {Object.entries(grouped).map(([year, list]) => (
                  <div key={year}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 py-1">{year}</p>
                    {list.map((c) => (
                      <label key={c.code} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                        <input type="checkbox" checked={codes.includes(c.code)} onChange={() => toggleCode(c.code)} className="accent-primary" data-testid={`assign-${c.code}`} />
                        <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                        <span className="truncate">{c.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} data-testid="save-user-btn">{existing ? "Enregistrer" : "Créer le compte"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
