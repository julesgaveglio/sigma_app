import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type CloseInfo = {
  closerNom: string;
  offre: string;
  formule: string | null;
  montantGenere: number;
  resultat: string | null;
  dateCall: Date | null;
} | null;

type HexaDossier = {
  id: number;
  civilite: string | null;
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: string | null;
  situationFamiliale: string | null;
  profession: string | null;
  mobile: string | null;
  fixe: string | null;
  adresse: string;
  codePostal: string;
  ville: string;
  paysNaissance: string;
  villeNaissance: string;
  montant: number;
  statut: string;
  notesInternes: string | null;
  assigneA: string | null;
  lienPaiement: string | null;
  paiementInitie: boolean;
  paiementRecu: boolean;
  createdAt: Date;
  closeInfo?: CloseInfo;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  en_cours: { label: "En cours", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  lien_envoye: { label: "Lien envoyé", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  paiement_initie: { label: "Paiement initié", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  paiement_recu: { label: "Paiement reçu", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  annule: { label: "Annulé", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const LIMIT = 25;

// ─── Composant détail dossier ─────────────────────────────────────────────────

function HexaDetail({ dossier, onClose, onUpdate }: {
  dossier: HexaDossier;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [statut, setStatut] = useState(dossier.statut);
  const [notes, setNotes] = useState(dossier.notesInternes ?? "");
  const [assigneA, setAssigneA] = useState(dossier.assigneA ?? "");
  const [lienPaiement, setLienPaiement] = useState(dossier.lienPaiement ?? "");
  const [paiementInitie, setPaiementInitie] = useState(dossier.paiementInitie);
  const [paiementRecu, setPaiementRecu] = useState(dossier.paiementRecu);

  const updateMutation = trpc.hexa.updateStatut.useMutation({
    onSuccess: () => {
      toast.success("Dossier mis à jour");
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ id: dossier.id, statut, notesInternes: notes, assigneA, lienPaiement, paiementInitie, paiementRecu });
  };

  const s = STATUT_LABELS[statut] ?? { label: statut, color: "bg-zinc-700 text-zinc-300" };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">{dossier.civilite ? `${dossier.civilite} ` : ""}{dossier.nom} {dossier.prenom}</h2>
            <p className="text-zinc-400 text-sm mt-0.5">Dossier #{dossier.id} · {new Date(dossier.createdAt).toLocaleDateString("fr-FR")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Montant */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Montant demandé</p>
            <p className="text-3xl font-bold text-amber-400">{dossier.montant.toLocaleString("fr-FR")} €</p>
          </div>

          {/* Matching rapport de vente */}
          {dossier.closeInfo && (
            <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4">
              <p className="text-xs text-green-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Matché avec le rapport de vente
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-zinc-500">Closer :</span> <span className="text-white font-medium">{dossier.closeInfo.closerNom}</span></div>
                <div><span className="text-zinc-500">Offre :</span> <span className="text-amber-400 font-medium">{dossier.closeInfo.offre}</span></div>
                {dossier.closeInfo.formule && <div><span className="text-zinc-500">Formule :</span> <span className="text-white">{dossier.closeInfo.formule}</span></div>}
                <div><span className="text-zinc-500">Montant généré :</span> <span className="text-white">{dossier.closeInfo.montantGenere.toLocaleString("fr-FR")} €</span></div>
                {dossier.closeInfo.dateCall && <div className="col-span-2"><span className="text-zinc-500">Date du call :</span> <span className="text-white">{new Date(dossier.closeInfo.dateCall).toLocaleDateString("fr-FR")}</span></div>}
              </div>
            </div>
          )}

          {/* Coordonnées */}
          <section>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-500">Email :</span> <span className="text-white">{dossier.email}</span></div>
              {dossier.mobile && <div><span className="text-zinc-500">Mobile :</span> <span className="text-white">{dossier.mobile}</span></div>}
              {dossier.fixe && <div><span className="text-zinc-500">Fixe :</span> <span className="text-white">{dossier.fixe}</span></div>}
              <div className="col-span-2"><span className="text-zinc-500">Adresse :</span> <span className="text-white">{dossier.adresse}, {dossier.codePostal} {dossier.ville}</span></div>
              {dossier.dateNaissance
                ? <div><span className="text-zinc-500">Naissance :</span> <span className="text-white">{new Date(dossier.dateNaissance).toLocaleDateString("fr-FR")} — {dossier.villeNaissance} ({dossier.paysNaissance})</span></div>
                : <div><span className="text-zinc-500">Naissance :</span> <span className="text-white">{dossier.villeNaissance} ({dossier.paysNaissance})</span></div>
              }
              {dossier.situationFamiliale && <div><span className="text-zinc-500">Situation :</span> <span className="text-white capitalize">{dossier.situationFamiliale.replace("_", " ")}</span></div>}
              {dossier.profession && <div><span className="text-zinc-500">Profession :</span> <span className="text-white">{dossier.profession}</span></div>}
            </div>
          </section>

          {/* Gestion interne */}
          <section className="border-t border-zinc-800 pt-5">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Gestion interne</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Statut</label>
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(STATUT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Lien de paiement Hexa Coop</label>
                <input
                  value={lienPaiement}
                  onChange={e => setLienPaiement(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-zinc-600 text-xs mt-1">Collez ici le lien généré sur le site Hexa Coop après traitement du dossier.</p>
              </div>

              {/* Suivi paiement */}
              <div className="border border-zinc-700 rounded-xl p-4">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Suivi paiement</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setPaiementInitie(!paiementInitie)}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${
                        paiementInitie ? "bg-amber-500" : "bg-zinc-700"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        paiementInitie ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${paiementInitie ? "text-amber-400" : "text-zinc-400"}`}>Paiement initié</p>
                      <p className="text-xs text-zinc-600">Le lien de paiement a été envoyé au client</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setPaiementRecu(!paiementRecu)}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${
                        paiementRecu ? "bg-green-500" : "bg-zinc-700"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        paiementRecu ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${paiementRecu ? "text-green-400" : "text-zinc-400"}`}>Paiement reçu</p>
                      <p className="text-xs text-zinc-600">Le paiement a été confirmé et encaissé</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Assigné à</label>
                <AssigneeSelect
                  mode="team"
                  value={assigneA}
                  onChange={(val) => setAssigneA(val)}
                  placeholder="— Sélectionner un membre —"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes internes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations, suivi..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition disabled:opacity-60"
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HexaDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<"hexa" | "commissions">("hexa");
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HexaDossier | null>(null);
  // ─── Commissions partenaires ───
  const [commTab, setCommTab] = useState<"courtage" | "immo">("courtage");
  const { data: transCourtage = [], refetch: refetchCourtage } = trpc.commissions.listTransactionsCourtage.useQuery(
    {},
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );
  const { data: transImmo = [], refetch: refetchImmo } = trpc.commissions.listTransactionsImmo.useQuery(
    {},
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );
  const validerCourtage = trpc.commissions.validerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Transaction validée !"); refetchCourtage(); },
    onError: (e) => toast.error(e.message),
  });
  const validerImmo = trpc.commissions.validerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Transaction validée !"); refetchImmo(); },
    onError: (e) => toast.error(e.message),
  });
  // marquerPaiement = alias valider avec statut paye
  const payerCourtage = trpc.commissions.validerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Paiement enregistré !"); refetchCourtage(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const payerImmo = trpc.commissions.validerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Paiement enregistré !"); refetchImmo(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const totalAttenteCourtage = (transCourtage as any[]).filter((t: any) => t.statut !== "paye").reduce((s: number, t: any) => s + (t.montantCommission || 0), 0);
  const totalAttenteImmo = (transImmo as any[]).filter((t: any) => t.statut !== "paye").reduce((s: number, t: any) => s + (t.montantHonoraires || 0), 0);

  const deleteMutation = trpc.hexa.delete.useMutation({
    onSuccess: () => { toast.success("Dossier supprimé"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le dossier de ${nom} ? Cette action est irréversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.hexa.list.useQuery(
    { search: search || undefined, statut: statut !== "tous" ? statut : undefined, limit: LIMIT, offset: (page - 1) * LIMIT },
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );

  const handleExport = () => {
    const items = (data?.items ?? []) as HexaDossier[];
    if (items.length === 0) { toast.error("Aucun dossier à exporter"); return; }
    const headers = ["ID", "Civilité", "Nom", "Prénom", "Email", "Mobile", "Adresse", "CP", "Ville", "Montant (€)", "Statut", "Paiement initié", "Paiement reçu", "Lien paiement", "Date"];
    const rows = items.map(d => [
      d.id, d.civilite ?? "", d.nom, d.prenom, d.email, d.mobile ?? "",
      d.adresse, d.codePostal, d.ville, d.montant,
      STATUT_LABELS[d.statut]?.label ?? d.statut,
      d.paiementInitie ? "Oui" : "Non",
      d.paiementRecu ? "Oui" : "Non",
      d.lienPaiement ?? "",
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hexa-dossiers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Vous devez être connecté pour accéder au tableau de bord.</p>
          <a href="/login" className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  if (user.role !== "admin" && user.role !== "direction") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <p className="text-zinc-400">Accès réservé à la direction.</p>
      </div>
    );
  }

  const dossiers = (data?.items ?? []) as HexaDossier[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-zinc-950">
      <AdminNav />

      {selected && (
        <HexaDetail
          dossier={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { refetch(); setSelected(null); }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Onglets principaux */}
        <div className="flex gap-0 border-b border-zinc-800 mb-8">
          {[
            { key: "hexa", label: "Sigma Crédit (Hexa)" },
            { key: "commissions", label: "Commissions partenaires" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                mainTab === tab.key ? "border-amber-500 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              {tab.label}
              {tab.key === "commissions" && ((transCourtage as any[]).filter((t: any) => t.statut === "en_attente").length + (transImmo as any[]).filter((t: any) => t.statut === "en_attente").length) > 0 && (
                <span className="ml-2 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {(transCourtage as any[]).filter((t: any) => t.statut === "en_attente").length + (transImmo as any[]).filter((t: any) => t.statut === "en_attente").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Commissions partenaires ── */}
        {mainTab === "commissions" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Courtage en attente</div>
                <div className="text-xl font-bold text-amber-400">{totalAttenteCourtage.toLocaleString("fr-FR")} €</div>
                <div className="text-xs text-zinc-600 mt-0.5">{(transCourtage as any[]).filter((t: any) => t.statut !== "paye").length} transaction(s)</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Immo en attente</div>
                <div className="text-xl font-bold text-amber-400">{totalAttenteImmo.toLocaleString("fr-FR")} €</div>
                <div className="text-xs text-zinc-600 mt-0.5">{(transImmo as any[]).filter((t: any) => t.statut !== "paye").length} transaction(s)</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Courtage payé</div>
                <div className="text-xl font-bold text-green-400">{(transCourtage as any[]).filter((t: any) => t.statut === "paye").reduce((s: number, t: any) => s + (t.montantCommission || 0), 0).toLocaleString("fr-FR")} €</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Immo payé</div>
                <div className="text-xl font-bold text-green-400">{(transImmo as any[]).filter((t: any) => t.statut === "paye").reduce((s: number, t: any) => s + (t.montantHonoraires || 0), 0).toLocaleString("fr-FR")} €</div>
              </div>
            </div>

            {/* Bouton export CSV */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const rows: string[][] = [];
                  rows.push(["TYPE", "ID PARTENAIRE", "LEAD / ADRESSE", "DOSSIER", "MONTANT BRUT (€)", "PART PARTENAIRE (€)", "PART SIGMA (€)", "PARRAIN N1 (€)", "PARRAIN N2 (€)", "STATUT", "DATE"]);
                  (transCourtage as any[]).forEach((t: any) => {
                    rows.push(["Courtage", String(t.courtierId), t.leadNom || "", t.dossierRef || "", String(t.montantCommission || ""), String(t.partCourtier || ""), String(t.partSigma || ""), String(t.partParrainN1 || ""), String(t.partParrainN2 || ""), t.statut, new Date(t.createdAt).toLocaleDateString("fr-FR")]);
                  });
                  (transImmo as any[]).forEach((t: any) => {
                    rows.push(["Immobilier", String(t.agentId), t.adresseBien || "", t.typeTransaction || "", String(t.montantHonoraires || ""), String(t.partAgent || ""), String(t.partSigma || ""), String(t.partParrainN1 || ""), String(t.partParrainN2 || ""), t.statut, new Date(t.createdAt).toLocaleDateString("fr-FR")]);
                  });
                  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `commissions-${new Date().toISOString().slice(0, 7)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Export CSV téléchargé");
                }}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV mensuel
              </button>
            </div>
            {/* Sous-onglets */}
            <div className="flex gap-0 border-b border-zinc-800">
              {[{ key: "courtage", label: "Courtage" }, { key: "immo", label: "Immobilier" }].map(tab => (
                <button key={tab.key} onClick={() => setCommTab(tab.key as any)}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                    commTab === tab.key ? "border-amber-500 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table Courtage */}
            {commTab === "courtage" && (
              (transCourtage as any[]).length === 0 ? (
                <div className="text-center py-16 text-zinc-600">
                  <p className="text-sm">Aucune transaction courtage déclarée</p>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase">Courtier</th>
                        <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase">Détail</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Commission</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Part courtier (75%)</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Part Sigma (25%)</th>
                        <th className="text-center px-4 py-3 text-zinc-500 text-xs uppercase">Statut</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transCourtage as any[]).map((t: any) => (
                        <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="px-4 py-3">
                            <div className="text-white font-medium text-xs">#{t.courtierId}</div>
                            {t.leadNom && <div className="text-zinc-500 text-xs">{t.leadNom}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {t.dossierRef && <div className="text-zinc-400 text-xs">{t.dossierRef}</div>}
                            {t.montantEnveloppe && <div className="text-zinc-500 text-xs">Enveloppe : {t.montantEnveloppe.toLocaleString("fr-FR")} €</div>}
                            <div className="text-zinc-600 text-xs">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.montantCommission ? <span className="text-amber-400 font-bold">{t.montantCommission.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600 text-xs">En attente</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.partCourtier ? <span className="text-green-400 font-semibold">{t.partCourtier.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.partSigma ? <span className="text-zinc-400">{t.partSigma.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              t.statut === "paye" ? "bg-green-500/10 text-green-400" :
                              t.statut === "valide" ? "bg-amber-500/10 text-amber-400" :
                              "bg-zinc-700 text-zinc-400"
                            }`}>
                              {t.statut === "paye" ? "✓ Payé" : t.statut === "valide" ? "✓ Validé" : "⏳ En attente"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {t.statut === "en_attente" && t.montantCommission && (
                                <button onClick={() => validerCourtage.mutate({ id: t.id, statut: "valide" })} className="text-xs px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                                  Valider
                                </button>
                              )}
                              {t.statut === "valide" && (
                                <button onClick={() => payerCourtage.mutate({ id: t.id, statut: "paye" })} className="text-xs px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                  Marquer payé
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Table Immo */}
            {commTab === "immo" && (
              (transImmo as any[]).length === 0 ? (
                <div className="text-center py-16 text-zinc-600">
                  <p className="text-sm">Aucune transaction immobilière déclarée</p>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase">Agent</th>
                        <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase">Bien</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Honoraires</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Part agent (50%)</th>
                        <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase">Part Sigma</th>
                        <th className="text-center px-4 py-3 text-zinc-500 text-xs uppercase">Statut</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transImmo as any[]).map((t: any) => (
                        <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="px-4 py-3">
                            <div className="text-white font-medium text-xs">#{t.agentId}</div>
                            <div className="text-zinc-600 text-xs">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-400 text-xs">{t.adresseBien || "—"}</div>
                            <div className="text-zinc-600 text-xs capitalize">{t.typeTransaction}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.montantHonoraires ? <span className="text-amber-400 font-bold">{t.montantHonoraires.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.partAgent ? <span className="text-green-400 font-semibold">{t.partAgent.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.partSigma ? <span className="text-zinc-400">{t.partSigma.toLocaleString("fr-FR")} €</span> : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              t.statut === "paye" ? "bg-green-500/10 text-green-400" :
                              t.statut === "valide" ? "bg-amber-500/10 text-amber-400" :
                              "bg-zinc-700 text-zinc-400"
                            }`}>
                              {t.statut === "paye" ? "✓ Payé" : t.statut === "valide" ? "✓ Validé" : "⏳ En attente"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {t.statut === "en_attente" && (
                                <button onClick={() => validerImmo.mutate({ id: t.id, statut: "valide" })} className="text-xs px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                                  Valider
                                </button>
                              )}
                              {t.statut === "valide" && (
                                <button onClick={() => payerImmo.mutate({ id: t.id, statut: "paye" })} className="text-xs px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                  Marquer payé
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Onglet Sigma Crédit ── */}
        {mainTab === "hexa" && (
          <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Sigma Crédit</h1>
            <p className="text-zinc-400 text-sm mt-1">{total} dossier{total > 1 ? "s" : ""} au total</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Exporter CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par nom, email, ville..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(0); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dossiers.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p>Aucun dossier trouvé</p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Ville</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Montant</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Statut</th>
                    <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Paiement initié</th>
                    <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Paiement reçu</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d, i) => {
                    const s = STATUT_LABELS[d.statut] ?? { label: d.statut, color: "bg-zinc-700 text-zinc-300 border-zinc-600" };
                    return (
                      <tr key={d.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition ${i % 2 === 0 ? "" : "bg-zinc-900/50"}`}>
                        <td className="px-4 py-3 text-zinc-500 font-mono">{d.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{d.civilite ? `${d.civilite} ` : ""}{d.nom} {d.prenom}</div>
                          <div className="text-zinc-500 text-xs">{d.email}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-zinc-300">{d.ville}</td>
                        <td className="px-4 py-3">
                          <span className="text-amber-400 font-bold">{d.montant.toLocaleString("fr-FR")} €</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-center">
                          {d.paiementInitie ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40">
                              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700">
                              <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-center">
                          {d.paiementRecu ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40">
                              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700">
                              <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-zinc-500 text-xs">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(d)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-xs transition"
                            >
                              Voir
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, d.id, `${d.nom} ${d.prenom}`)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition"
                              title="Supprimer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs">{total} dossier{total > 1 ? "s" : ""} · Page {page + 1}/{totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-40 hover:bg-zinc-700 transition"
                  >
                    ← Préc.
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-40 hover:bg-zinc-700 transition"
                  >
                    Suiv. →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
