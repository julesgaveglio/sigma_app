import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, User, Crown, Loader2, Mail, Search, Building2, ToggleLeft, ToggleRight, Send } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  user: { label: "Utilisateur", color: "text-blue-400 bg-blue-400/10 border-blue-400/30", icon: User },
  agent: { label: "Agent immo", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: Building2 },
  direction: { label: "Direction", color: "text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/30", icon: Crown },
  admin: { label: "Admin", color: "text-red-400 bg-red-400/10 border-red-400/30", icon: Shield },
};

export default function AdminWhitelist() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "direction" | "agent">("user");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin" | "direction" | "agent">("user");

  const utils = trpc.useUtils();
  const { data: whitelist, isLoading } = trpc.admin.listWhitelist.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "direction"),
  });

  const addMutation = trpc.admin.addWhitelist.useMutation({
    onSuccess: () => {
      toast.success(sendWelcome ? "Accès ajouté — email de bienvenue envoyé !" : "Accès ajouté");
      utils.admin.listWhitelist.invalidate();
      setNewEmail(""); setNewNom(""); setNewRole("user"); setSendWelcome(true); setShowForm(false);
    },
    onError: (e) => toast.error(e.message.includes("Duplicate") ? "Cet email est déjà dans la liste" : e.message),
  });

  const removeMutation = trpc.admin.removeWhitelist.useMutation({
    onSuccess: () => { toast.success("Accès supprimé"); utils.admin.listWhitelist.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateWhitelistRole.useMutation({
    onSuccess: () => { toast.success("Rôle mis à jour"); utils.admin.listWhitelist.invalidate(); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.admin.toggleWhitelistActif.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.actif ? "Accès réactivé" : "Accès suspendu");
      utils.admin.listWhitelist.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resendMutation = trpc.admin.resendWelcomeEmail.useMutation({
    onSuccess: () => toast.success("Email de bienvenue renvoyé !"),
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
    </div>
  );

  if (!user) { window.location.href = "/login"; return null; }

  if (user.role !== "admin" && user.role !== "direction") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  const filtered = (whitelist ?? []).filter(e =>
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.nom ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const actifCount = (whitelist ?? []).filter(e => (e as any).actif !== false).length;
  const inactifCount = (whitelist ?? []).length - actifCount;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="pt-16 px-4 md:px-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mt-8 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Accès autorisés</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {actifCount} actif{actifCount > 1 ? "s" : ""}
              {inactifCount > 0 && <span className="text-orange-400 ml-2">· {inactifCount} suspendu{inactifCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg text-sm hover:bg-[var(--gold)]/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un accès
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[var(--gold)]" />
              Nouvel accès autorisé
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Prénom et Nom</label>
                <input
                  type="text"
                  value={newNom}
                  onChange={e => setNewNom(e.target.value)}
                  placeholder="ex: Jérôme CHIBAU"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--gold)]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Adresse email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="ex: jerome@exemple.fr"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--gold)]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Rôle</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--gold)]"
                >
                  <option value="agent">Agent immobilier (IAD, réseau...)</option>
                  <option value="user">Utilisateur (courtier, partenaire...)</option>
                  <option value="direction">Direction (Maria, Manon, Élodie...)</option>
                  <option value="admin">Admin (Othmane)</option>
                </select>
              </div>
            </div>
            {/* Option email de bienvenue */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWelcome}
                onChange={e => setSendWelcome(e.target.checked)}
                className="w-4 h-4 accent-[var(--gold)]"
              />
              <span className="text-sm text-muted-foreground">
                Envoyer automatiquement un <strong className="text-foreground">email de bienvenue</strong> avec le lien d'inscription
              </span>
            </label>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addMutation.mutate({ email: newEmail, nom: newNom, role: newRole, sendWelcomeEmail: sendWelcome })}
                disabled={!newEmail || !newNom || addMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[var(--gold)]/90 transition-colors"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Ajouter
              </button>
              <button
                onClick={() => { setShowForm(false); setNewEmail(""); setNewNom(""); }}
                className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--gold)]"
          />
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Aucun accès trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => {
              const roleInfo = ROLE_LABELS[entry.role] ?? ROLE_LABELS.user;
              const RoleIcon = roleInfo.icon;
              const isEditing = editId === entry.id;
              const isActif = (entry as any).actif !== false;

              return (
                <div key={entry.id} className={`bg-card border rounded-xl px-5 py-4 transition-opacity ${isActif ? "border-border" : "border-orange-400/30 opacity-60"}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="text"
                        value={editNom}
                        onChange={e => setEditNom(e.target.value)}
                        className="flex-1 min-w-[150px] bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-[var(--gold)]"
                      />
                      <span className="text-sm text-muted-foreground">{entry.email}</span>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as any)}
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-[var(--gold)]"
                      >
                        <option value="agent">Agent immobilier</option>
                        <option value="user">Utilisateur</option>
                        <option value="direction">Direction</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => updateMutation.mutate({ id: entry.id, nom: editNom, role: editRole })}
                        disabled={updateMutation.isPending}
                        className="px-3 py-1.5 bg-[var(--gold)] text-black text-sm font-semibold rounded-lg"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sauvegarder"}
                      </button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isActif ? "bg-[var(--gold)]/10" : "bg-orange-400/10"}`}>
                          <RoleIcon className={`w-4 h-4 ${isActif ? "text-[var(--gold)]" : "text-orange-400"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm truncate">{entry.nom ?? "—"}</p>
                            {!isActif && <span className="text-xs text-orange-400 font-medium">Suspendu</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </span>
                        {/* Renvoyer email de bienvenue */}
                        <button
                          onClick={() => resendMutation.mutate({ id: entry.id })}
                          disabled={resendMutation.isPending}
                          className="p-1.5 text-muted-foreground hover:text-[var(--gold)] transition-colors"
                          title="Renvoyer l'email de bienvenue"
                        >
                          {resendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                        {/* Modifier le rôle */}
                        <button
                          onClick={() => { setEditId(entry.id); setEditNom(entry.nom ?? ""); setEditRole(entry.role as any); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Modifier le rôle"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {/* Toggle actif/inactif */}
                        <button
                          onClick={() => toggleMutation.mutate({ id: entry.id, actif: !isActif })}
                          disabled={toggleMutation.isPending}
                          className={`p-1.5 transition-colors ${isActif ? "text-emerald-400 hover:text-orange-400" : "text-orange-400 hover:text-emerald-400"}`}
                          title={isActif ? "Suspendre l'accès" : "Réactiver l'accès"}
                        >
                          {isActif ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer définitivement l'accès de ${entry.nom ?? entry.email} ?`)) {
                              removeMutation.mutate({ id: entry.id });
                            }
                          }}
                          disabled={removeMutation.isPending}
                          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
