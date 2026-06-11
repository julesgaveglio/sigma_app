import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, User, Crown, Loader2, Mail, Search, Building2, ToggleLeft, ToggleRight, Send } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  user: { label: "Utilisateur", icon: User, color: "var(--foreground-muted)", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  agent: { label: "Agent immo", icon: Building2, color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  direction: { label: "Direction", icon: Crown, color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  admin: { label: "Admin", icon: Shield, color: "var(--destructive)", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
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
      toast.success(sendWelcome ? "Acces ajoute — email de bienvenue envoye !" : "Acces ajoute");
      utils.admin.listWhitelist.invalidate();
      setNewEmail(""); setNewNom(""); setNewRole("user"); setSendWelcome(true); setShowForm(false);
    },
    onError: (e) => toast.error(e.message.includes("Duplicate") ? "Cet email est deja dans la liste" : e.message),
  });

  const removeMutation = trpc.admin.removeWhitelist.useMutation({
    onSuccess: () => { toast.success("Acces supprime"); utils.admin.listWhitelist.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateWhitelistRole.useMutation({
    onSuccess: () => { toast.success("Role mis a jour"); utils.admin.listWhitelist.invalidate(); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.admin.toggleWhitelistActif.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.actif ? "Acces reactive" : "Acces suspendu");
      utils.admin.listWhitelist.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resendMutation = trpc.admin.resendWelcomeEmail.useMutation({
    onSuccess: () => toast.success("Email de bienvenue renvoye !"),
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
    </div>
  );

  if (!user) { window.location.href = "/login"; return null; }

  if (user.role !== "admin" && user.role !== "direction") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.04em" }}>Acces refuse</h2>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Acces reserve aux administrateurs.</p>
      </div>
    );
  }

  const filtered = (whitelist ?? []).filter(e =>
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.nom ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const actifCount = (whitelist ?? []).filter(e => (e as any).actif !== false).length;
  const inactifCount = (whitelist ?? []).length - actifCount;

  // Shared input style
  const inputStyle = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "var(--foreground)",
    outline: "none",
    transition: "border-color 300ms ease",
    width: "100%",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />
      <main className="px-5 py-8" style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
            }}>
              Acces autorises
            </h1>
            <p style={{
              fontSize: "12px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "var(--foreground-muted)",
              marginTop: "4px",
            }}>
              <span className="tabular-nums">{actifCount}</span> actif{actifCount > 1 ? "s" : ""}
              {inactifCount > 0 && <span style={{ color: "var(--gold)", marginLeft: "8px" }}>· {inactifCount} suspendu{inactifCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 transition-opacity duration-300 hover:opacity-80"
            style={{
              padding: "10px 20px",
              background: "var(--gold)",
              color: "var(--background)",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              borderRadius: "2px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <UserPlus className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            Ajouter un acces
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showForm && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "24px",
            marginBottom: "24px",
          }}>
            <div className="flex items-center gap-2 mb-5">
              <UserPlus className="w-4 h-4" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.02em",
              }}>
                Nouvel acces autorise
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-uppercase block mb-2">Prenom et Nom</label>
                <input
                  type="text"
                  value={newNom}
                  onChange={e => setNewNom(e.target.value)}
                  placeholder="ex: Jerome CHIBAU"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="label-uppercase block mb-2">Adresse email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="ex: jerome@exemple.fr"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="label-uppercase block mb-2">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                >
                  <option value="agent">Agent immobilier (IAD, reseau...)</option>
                  <option value="user">Utilisateur (courtier, partenaire...)</option>
                  <option value="direction">Direction (Maria, Manon, Elodie...)</option>
                  <option value="admin">Admin (Othmane)</option>
                </select>
              </div>
            </div>
            {/* Option email de bienvenue */}
            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWelcome}
                onChange={e => setSendWelcome(e.target.checked)}
                style={{ accentColor: "var(--gold)" }}
              />
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>
                Envoyer automatiquement un <strong style={{ color: "var(--foreground)" }}>email de bienvenue</strong> avec le lien d'inscription
              </span>
            </label>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => addMutation.mutate({ email: newEmail, nom: newNom, role: newRole, sendWelcomeEmail: sendWelcome })}
                disabled={!newEmail || !newNom || addMutation.isPending}
                className="flex items-center gap-2 transition-opacity duration-300"
                style={{
                  padding: "10px 20px",
                  background: (!newEmail || !newNom || addMutation.isPending) ? "var(--gold-muted)" : "var(--gold)",
                  color: "var(--background)",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                  cursor: (!newEmail || !newNom || addMutation.isPending) ? "not-allowed" : "pointer",
                  opacity: (!newEmail || !newNom || addMutation.isPending) ? 0.7 : 1,
                }}
              >
                {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />}
                Ajouter
              </button>
              <button
                onClick={() => { setShowForm(false); setNewEmail(""); setNewNom(""); }}
                className="transition-opacity duration-300 hover:opacity-70"
                style={{
                  padding: "10px 20px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "var(--foreground-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full transition-colors duration-300 focus:outline-none"
            style={{
              ...inputStyle,
              background: "var(--surface)",
              paddingLeft: "36px",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--gold)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun acces trouve</p>
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            {filtered.map((entry, idx) => {
              const roleInfo = ROLE_LABELS[entry.role] ?? ROLE_LABELS.user;
              const RoleIcon = roleInfo.icon;
              const isEditing = editId === entry.id;
              const isActif = (entry as any).actif !== false;

              return (
                <div key={entry.id}
                  className="transition-colors duration-300"
                  style={{
                    padding: "14px 20px",
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    opacity: isActif ? 1 : 0.5,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="text"
                        value={editNom}
                        onChange={e => setEditNom(e.target.value)}
                        className="flex-1 focus:outline-none"
                        style={{ ...inputStyle, minWidth: "150px" }}
                        onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                      />
                      <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{entry.email}</span>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as any)}
                        style={{ ...inputStyle, width: "auto" }}
                        onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                      >
                        <option value="agent">Agent immobilier</option>
                        <option value="user">Utilisateur</option>
                        <option value="direction">Direction</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => updateMutation.mutate({ id: entry.id, nom: editNom, role: editRole })}
                        disabled={updateMutation.isPending}
                        className="transition-opacity duration-300 hover:opacity-80"
                        style={{
                          padding: "6px 14px",
                          background: "var(--gold)",
                          color: "var(--background)",
                          fontSize: "11px",
                          fontWeight: 500,
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          borderRadius: "2px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sauvegarder"}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="transition-opacity duration-300 hover:opacity-70"
                        style={{
                          padding: "6px 14px",
                          fontSize: "11px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          color: "var(--foreground-muted)",
                          border: "1px solid var(--border)",
                          borderRadius: "2px",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <RoleIcon className="w-4 h-4 shrink-0" style={{ color: isActif ? "var(--foreground-muted)" : "var(--foreground-faint)", strokeWidth: 1.5 }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p style={{
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--foreground)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap" as const,
                            }}>{entry.nom ?? "—"}</p>
                            {!isActif && <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--gold)" }}>Suspendu</span>}
                          </div>
                          <p style={{
                            fontSize: "11px",
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            color: "var(--foreground-faint)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}>{entry.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "2px",
                          fontSize: "10px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: roleInfo.color,
                          background: roleInfo.bg,
                          border: `1px solid ${roleInfo.border}`,
                        }}>
                          <RoleIcon className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                          {roleInfo.label}
                        </span>
                        {/* Renvoyer email */}
                        <button
                          onClick={() => resendMutation.mutate({ id: entry.id })}
                          disabled={resendMutation.isPending}
                          className="p-1.5 transition-opacity duration-300 hover:opacity-70"
                          style={{ color: "var(--foreground-faint)", background: "none", border: "none", cursor: "pointer" }}
                          title="Renvoyer l'email de bienvenue"
                        >
                          {resendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--foreground-muted)" }} /> : <Send className="w-4 h-4" style={{ strokeWidth: 1.5 }} />}
                        </button>
                        {/* Modifier */}
                        <button
                          onClick={() => { setEditId(entry.id); setEditNom(entry.nom ?? ""); setEditRole(entry.role as any); }}
                          className="p-1.5 transition-opacity duration-300 hover:opacity-70"
                          style={{ color: "var(--foreground-faint)", background: "none", border: "none", cursor: "pointer" }}
                          title="Modifier le role"
                        >
                          <Shield className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                        </button>
                        {/* Toggle actif */}
                        <button
                          onClick={() => toggleMutation.mutate({ id: entry.id, actif: !isActif })}
                          disabled={toggleMutation.isPending}
                          className="p-1.5 transition-colors duration-300"
                          style={{
                            color: isActif ? "var(--success)" : "var(--gold)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = isActif ? "var(--gold)" : "var(--success)")}
                          onMouseLeave={e => (e.currentTarget.style.color = isActif ? "var(--success)" : "var(--gold)")}
                          title={isActif ? "Suspendre l'acces" : "Reactiver l'acces"}
                        >
                          {isActif ? <ToggleRight className="w-5 h-5" style={{ strokeWidth: 1.5 }} /> : <ToggleLeft className="w-5 h-5" style={{ strokeWidth: 1.5 }} />}
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer definitivement l'acces de ${entry.nom ?? entry.email} ?`)) {
                              removeMutation.mutate({ id: entry.id });
                            }
                          }}
                          disabled={removeMutation.isPending}
                          className="p-1.5 transition-colors duration-300"
                          style={{ color: "var(--foreground-faint)", background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--destructive)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--foreground-faint)")}
                          title="Supprimer definitivement"
                        >
                          <Trash2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
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
