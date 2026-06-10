import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, FileText, Search, ChevronRight,
  CheckCircle, Clock, XCircle, Plus, Download, Trash2,
  Upload, Send, Eye, FolderOpen, ChevronDown, ChevronUp, X,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  actif: "bg-green-500/10 text-green-400 border-green-500/20",
  suspendu: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  resilie: "bg-red-500/10 text-red-400 border-red-500/20",
};
const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
  resilie: "Résilié",
};

const DOSSIER_STATUT_COLORS: Record<string, string> = {
  nouveau: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  en_cours: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  envoye: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  valide: "bg-green-500/10 text-green-400 border-green-500/20",
  refuse: "bg-red-500/10 text-red-400 border-red-500/20",
};
const DOSSIER_STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  envoye: "Envoyé",
  valide: "Validé",
  refuse: "Refusé",
};

// ─── Onglet Dossiers Courtage ─────────────────────────────────────────────────

function DossierCourtageRow({ dossier, courtiers, onRefetch }: {
  dossier: any;
  courtiers: any[];
  onRefetch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCourtiers, setSelectedCourtiers] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const uploadDocMutation = trpc.financement.uploadDoc.useMutation({
    onSuccess: () => {
      toast.success("Document ajouté");
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const assignerMutation = trpc.financement.assigner.useMutation({
    onSuccess: (data) => {
      toast.success(`Dossier envoyé à ${data.nbAssignations} courtier(s)`);
      setSelectedCourtiers([]);
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const supprimerDocMutation = trpc.financement.supprimerDoc.useMutation({
    onSuccess: () => {
      toast.success("Document supprimé");
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Fichier trop lourd (max 16 Mo)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadDocMutation.mutateAsync({
          dossierFinancementId: dossier.id,
          nom: file.name,
          type: file.name.split(".").pop()?.toLowerCase() ?? "pdf",
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleCourtier = (id: number) => {
    setSelectedCourtiers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const courtiersActifs = courtiers.filter((c: any) => c.statutInterne === "actif");

  return (
    <div className="bg-[#111] border border-gray-800 overflow-hidden">
      {/* Ligne principale */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">
              {dossier.emprunteur1Prenom} {dossier.emprunteur1Nom}
            </span>
            <Badge className={`text-xs border ${DOSSIER_STATUT_COLORS[dossier.statut] ?? ""}`}>
              {DOSSIER_STATUT_LABELS[dossier.statut] ?? dossier.statut}
            </Badge>
          </div>
          <div className="text-gray-500 text-xs mt-0.5">
            {dossier.montantProjet?.toLocaleString("fr-FR")} € · {dossier.duree} mois · {dossier.apportPersonnel?.toLocaleString("fr-FR")} € apport
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {dossier.docs?.length ?? 0} doc(s)
          </span>
          <span className="flex items-center gap-1">
            <Send className="w-3.5 h-3.5" />
            {dossier.assignations?.length ?? 0} courtier(s)
          </span>
          <span>{new Date(dossier.createdAt).toLocaleDateString("fr-FR")}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Détail expandé */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-5 bg-[#0d0d0d]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Revenus nets/mois</p>
              <p className="text-white text-sm font-semibold">{dossier.emprunteur1RevenusMensuelsNets?.toLocaleString("fr-FR") ?? "—"} €</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Charges mensuelles</p>
              <p className="text-white text-sm font-semibold">{dossier.chargesMensuelles?.toLocaleString("fr-FR") ?? "—"} €</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Activité</p>
              <p className="text-white text-sm font-semibold">{dossier.emprunteur1Activite ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Situation matrimoniale</p>
              <p className="text-white text-sm font-semibold">{dossier.emprunteur1SituationMatrimoniale ?? "—"}</p>
            </div>
          </div>

          {/* Documents joints */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Documents joints</p>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 text-xs gap-1"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Envoi..." : "Ajouter un document"}
                </Button>
              </div>
            </div>
            {(!dossier.docs || dossier.docs.length === 0) ? (
              <p className="text-gray-600 text-xs italic">Aucun document joint. Ajoutez CNI, bulletins de salaire, avis d'imposition…</p>
            ) : (
              <div className="space-y-1">
                {dossier.docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-black p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />
                      <span className="text-white text-xs">{doc.nom}</span>
                      <span className="text-gray-600 text-xs uppercase">{doc.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-500 hover:text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => supprimerDocMutation.mutate({ id: doc.id })}
                        className="p-1 text-gray-600 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignation courtiers */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Envoyer à des courtiers</p>
            {courtiersActifs.length === 0 ? (
              <p className="text-gray-600 text-xs italic">Aucun courtier actif dans le réseau.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {courtiersActifs.map((c: any) => {
                    const isSelected = selectedCourtiers.includes(c.id);
                    const dejaEnvoye = dossier.assignations?.some((a: any) => a.courtierId === c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => !dejaEnvoye && toggleCourtier(c.id)}
                        disabled={dejaEnvoye}
                        className={`px-3 py-1.5 text-xs rounded border transition-all ${
                          dejaEnvoye
                            ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
                            : isSelected
                            ? "border-[#C9A84C] bg-[#C9A84C]/20 text-[#C9A84C]"
                            : "border-gray-700 text-gray-400 hover:border-gray-500"
                        }`}
                      >
                        {dejaEnvoye && "✓ "}{c.prenom} {c.nom}
                        {c.cabinetNom && <span className="text-gray-500 ml-1">· {c.cabinetNom}</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedCourtiers.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold gap-2"
                    onClick={() => assignerMutation.mutate({
                      dossierFinancementId: dossier.id,
                      courtierIds: selectedCourtiers,
                    })}
                    disabled={assignerMutation.isPending}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer à {selectedCourtiers.length} courtier(s)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Assignations existantes */}
          {dossier.assignations && dossier.assignations.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Suivi des envois</p>
              <div className="space-y-1">
                {dossier.assignations.map((a: any) => {
                  const courtier = courtiers.find((c: any) => c.id === a.courtierId);
                  const statutColors: Record<string, string> = {
                    en_attente: "text-yellow-400",
                    en_cours: "text-blue-400",
                    valide: "text-green-400",
                    refuse: "text-red-400",
                  };
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-black p-2 rounded text-xs">
                      <span className="text-white">{courtier ? `${courtier.prenom} ${courtier.nom}` : `Courtier #${a.courtierId}`}</span>
                      <div className="flex items-center gap-2">
                        {a.noteCourtier && <span className="text-gray-500 italic max-w-48 truncate">"{a.noteCourtier}"</span>}
                        <span className={`font-semibold ${statutColors[a.statut] ?? "text-gray-400"}`}>
                          {DOSSIER_STATUT_LABELS[a.statut] ?? a.statut}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CourtiersDashboard() {
  const [activeTab, setActiveTab] = useState<"reseau" | "dossiers" | "compteur">("reseau");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("tous");
  const [selectedCourtier, setSelectedCourtier] = useState<number | null>(null);
  const [dossierSearch, setDossierSearch] = useState("");
  const [dossierStatut, setDossierStatut] = useState("tous");

  // ─── Triggers retard courtiers ───────────────────────────────────────────
  const { data: retardsCourtiers = [], refetch: refetchRetards } = trpc.triggers.checkRetardsCourtiers.useQuery();
  const declencherTrigger = trpc.triggers.declencherTriggerCourtier.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? "Courtier suspendu et Manon notifiée");
      refetch();
      refetchRetards();
    },
    onError: (e) => toast.error(e.message),
  });
  const reactiverCourtier = trpc.triggers.reactiverCourtier.useMutation({
    onSuccess: () => { toast.success("Courtier réactivé"); refetch(); refetchRetards(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: courtiers = [], refetch } = trpc.courtiers.list.useQuery({
    statut: statutFilter as any,
    search: search || undefined,
  });

  const { data: detail } = trpc.courtiers.getById.useQuery(
    { id: selectedCourtier! },
    { enabled: !!selectedCourtier }
  );

  const { data: dossiers = [], refetch: refetchDossiers } = trpc.financement.lister.useQuery(
    { search: dossierSearch || undefined, statut: dossierStatut !== "tous" ? dossierStatut : undefined },
    { enabled: activeTab === "dossiers" }
  );

  const { data: allCourtiers = [] } = trpc.courtiers.list.useQuery(
    { statut: "tous" as any },
    { enabled: activeTab === "dossiers" }
  );

  const { data: statsCourtiers = [] } = trpc.financement.statsParCourtier.useQuery(
    undefined,
    { enabled: activeTab === "compteur" }
  );

  const updateStatut = trpc.courtiers.updateStatut.useMutation({
    onSuccess: () => { toast.success("Statut mis à jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const renvoyerBienvenue = trpc.courtiers.renvoyerEmailBienvenue.useMutation({
    onSuccess: (res) => toast.success(res.message ?? "Email de bienvenue envoyé !"),
    onError: (e) => toast.error(e.message),
  });

  const deleteCourtier = trpc.courtiers.delete.useMutation({
    onSuccess: () => { toast.success("Courtier supprimé"); refetch(); setSelectedCourtier(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le courtier ${nom} ? Cette action est irréversible.`)) {
      deleteCourtier.mutate({ id });
    }
  };

  const stats = {
    total: courtiers.length,
    actifs: courtiers.filter((c: any) => c.statutInterne === "actif").length,
    enAttente: courtiers.filter((c: any) => c.statutInterne === "en_attente").length,
  };

  const dossierStats = {
    total: dossiers.length,
    nouveaux: dossiers.filter((d: any) => d.statut === "nouveau").length,
    envoyes: dossiers.filter((d: any) => d.statut === "envoye").length,
    valides: dossiers.filter((d: any) => d.statut === "valide").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Courtage</h1>
            <p className="text-gray-500 text-sm mt-1">Réseau courtiers & dossiers de financement</p>
          </div>
          <Link href="/inscription-courtier">
            <Button className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold gap-2">
              <Plus className="w-4 h-4" />
              Lien d'inscription
            </Button>
          </Link>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 border-b border-gray-800">
          {[
            { key: "reseau", label: "Réseau Courtiers", icon: <Users className="w-4 h-4" /> },
            { key: "dossiers", label: "Dossiers Courtage", icon: <FolderOpen className="w-4 h-4" /> },
            { key: "compteur", label: "Compteur Courtiers", icon: <CheckCircle className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "dossiers" && dossierStats.nouveaux > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
                  {dossierStats.nouveaux}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Réseau Courtiers ── */}
        {activeTab === "reseau" && (
          <>
            {/* ── Panneau alertes retard ── */}
            {retardsCourtiers.length > 0 && (
              <div className="border border-red-500/40 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-bold text-sm">{retardsCourtiers.length} courtier(s) en retard — dossier(s) non traité(s) depuis plus de 72h</h3>
                </div>
                <div className="space-y-2">
                  {retardsCourtiers.map((r: any) => {
                    const heuresRetard = Math.floor((Date.now() - r.ancienneAssignationMs) / (1000 * 60 * 60));
                    return (
                      <div key={r.courtierId} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-3">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <div>
                            <div className="text-white font-semibold text-sm">{r.courtierNom}</div>
                            <div className="text-red-300 text-xs">{r.nbDossiersEnRetard} dossier(s) · {heuresRetard}h de retard · {r.courtierEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.statutInterne !== "suspendu" && (
                            <Button
                              size="sm"
                              onClick={() => declencherTrigger.mutate({ courtierId: r.courtierId })}
                              disabled={declencherTrigger.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Suspendre + Notifier Manon
                            </Button>
                          )}
                          {r.statutInterne === "suspendu" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reactiverCourtier.mutate({ courtierId: r.courtierId })}
                              disabled={reactiverCourtier.isPending}
                              className="border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Réactiver
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#111] border border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-[#C9A84C]" />
                  <div>
                    <div className="text-2xl font-black text-white">{stats.total}</div>
                    <div className="text-gray-500 text-xs">Courtiers total</div>
                  </div>
                </div>
              </div>
              <div className="bg-[#111] border border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-black text-white">{stats.actifs}</div>
                    <div className="text-gray-500 text-xs">Actifs</div>
                  </div>
                </div>
              </div>
              <div className="bg-[#111] border border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-black text-white">{stats.enAttente}</div>
                    <div className="text-gray-500 text-xs">En attente de validation</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Rechercher un courtier..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-[#111] border-gray-700 text-white pl-9"
                    />
                  </div>
                  <Select value={statutFilter} onValueChange={setStatutFilter}>
                    <SelectTrigger className="bg-[#111] border-gray-700 text-white w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-gray-700">
                      <SelectItem value="tous">Tous</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="actif">Actifs</SelectItem>
                      <SelectItem value="suspendu">Suspendus</SelectItem>
                      <SelectItem value="resilie">Résiliés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-[#111] border border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs text-gray-500 font-medium p-3">Courtier</th>
                        <th className="text-left text-xs text-gray-500 font-medium p-3">Cabinet</th>
                        <th className="text-left text-xs text-gray-500 font-medium p-3">ORIAS</th>
                        <th className="text-left text-xs text-gray-500 font-medium p-3">Statut</th>
                        <th className="text-left text-xs text-gray-500 font-medium p-3">Niveau</th>
                        <th className="text-left text-xs text-gray-500 font-medium p-3">Dernière connexion</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {courtiers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-600 py-12">Aucun courtier inscrit</td>
                        </tr>
                      )}
                      {courtiers.map((c: any) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCourtier(c.id)}
                          className={`border-b border-gray-800/50 cursor-pointer hover:bg-[#1a1a1a] transition-colors ${selectedCourtier === c.id ? "bg-[#1a1a1a]" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-semibold text-white text-sm">{c.prenom} {c.nom}</div>
                            <div className="text-gray-500 text-xs">{c.email}</div>
                          </td>
                          <td className="p-3 text-gray-400 text-sm">{c.cabinetNom || "—"}</td>
                          <td className="p-3 text-gray-400 text-sm font-mono">{c.numeroOrias || "—"}</td>
                          <td className="p-3">
                            <Badge className={`text-xs border ${STATUT_COLORS[c.statutInterne] || ""}`}>
                              {STATUT_LABELS[c.statutInterne] || c.statutInterne}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20 text-xs">N{c.niveau}</Badge>
                          </td>
                          <td className="p-3">
                            {c.lastSignedIn ? (
                              <div>
                                <div className="text-xs text-gray-300">{new Date(c.lastSignedIn).toLocaleDateString("fr-FR")}</div>
                                <div className="text-xs text-gray-600">{new Date(c.lastSignedIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-600 italic">Jamais connecté</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                              <button
                                onClick={(e) => handleDelete(e, c.id, `${c.prenom} ${c.nom}`)}
                                className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-4">
                {!selectedCourtier && (
                  <div className="bg-[#111] border border-gray-800 p-6 text-center text-gray-600">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sélectionnez un courtier</p>
                  </div>
                )}
                {detail && (
                  <div className="bg-[#111] border border-gray-800 p-4 space-y-4">
                    <div>
                      <h3 className="font-black text-white">{detail.courtier.prenom} {detail.courtier.nom}</h3>
                      <p className="text-gray-500 text-xs">{detail.courtier.email}</p>
                      {detail.courtier.cabinetNom && <p className="text-[#C9A84C] text-xs mt-1">{detail.courtier.cabinetNom}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black p-3 text-center">
                        <div className="text-xl font-black text-white">{detail.stats.totalDossiers}</div>
                        <div className="text-gray-600 text-xs">Dossiers</div>
                      </div>
                      <div className="bg-black p-3 text-center">
                        <div className="text-xl font-black text-[#C9A84C]">{detail.stats.totalFilleuls}</div>
                        <div className="text-gray-600 text-xs">Filleuls</div>
                      </div>
                    </div>
                    {detail.courtier.conventionPdfUrl && (
                      <a href={detail.courtier.conventionPdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#C9A84C] text-sm hover:underline">
                        <FileText className="w-4 h-4" />
                        Voir la convention signée
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 text-xs"
                      disabled={renvoyerBienvenue.isPending}
                      onClick={() => renvoyerBienvenue.mutate({ id: detail.courtier.id })}
                    >
                      <Send className="w-3 h-3 mr-2" />
                      {renvoyerBienvenue.isPending ? "Envoi en cours..." : "Renvoyer l'email de bienvenue"}
                    </Button>
                    {/* Documents bidirectionnels Manon ↔ Courtier */}
                    <div className="border-t border-gray-800 pt-4">
                      <PartnerDocumentsSection
                        partnerType="courtier"
                        partnerId={detail.courtier.id}
                        partnerNom={`${detail.courtier.prenom ?? ""} ${detail.courtier.nom}`}
                        partnerEmail={detail.courtier.email}
                        viewAs="admin"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Changer le statut</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["en_attente", "actif", "suspendu", "resilie"].map(s => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            disabled={detail.courtier.statutInterne === s}
                            onClick={() => updateStatut.mutate({ id: detail.courtier.id, statutInterne: s as any })}
                            className={`text-xs border-gray-700 ${detail.courtier.statutInterne === s ? "opacity-50" : "hover:border-[#C9A84C] hover:text-[#C9A84C]"}`}
                          >
                            {STATUT_LABELS[s]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Onglet Compteur Courtiers ── */}
        {activeTab === "compteur" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Courtiers avec dossiers", value: statsCourtiers.filter((s: any) => s.total > 0).length, color: "text-white" },
                { label: "Total dossiers envoyés", value: statsCourtiers.reduce((acc: number, s: any) => acc + s.total, 0), color: "text-[#C9A84C]" },
                { label: "Dossiers validés", value: statsCourtiers.reduce((acc: number, s: any) => acc + s.valide, 0), color: "text-green-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#111] border border-gray-800 p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Alerte globale quota */}
            {statsCourtiers.some((s: any) => s.hebdo >= 10) && (
              <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <span className="text-orange-400 text-xl">⚠️</span>
                <div>
                  <p className="text-orange-300 font-semibold text-sm">Quota hebdomadaire atteint</p>
                  <p className="text-orange-400/70 text-xs mt-0.5">
                    {statsCourtiers.filter((s: any) => s.hebdo >= 10).map((s: any) => s.courtierNom).join(", ")} — 10 dossiers assignés cette semaine. Vous pouvez continuer mais restez vigilant(e).
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#111] border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium p-3">Courtier</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">Cabinet</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">Statut</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">Régions</th>
                    <th className="text-center text-xs text-orange-400/80 font-medium p-3">Cette semaine</th>
                    <th className="text-center text-xs text-gray-500 font-medium p-3">Total</th>
                    <th className="text-center text-xs text-yellow-400/70 font-medium p-3">En attente</th>
                    <th className="text-center text-xs text-blue-400/70 font-medium p-3">En cours</th>
                    <th className="text-center text-xs text-green-400/70 font-medium p-3">Validés</th>
                    <th className="text-center text-xs text-red-400/70 font-medium p-3">Refusés</th>
                  </tr>
                </thead>
                <tbody>
                  {statsCourtiers.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-gray-600 py-12">Aucun courtier inscrit</td></tr>
                  )}
                  {statsCourtiers.map((s: any) => {
                    const quotaAtteint = s.hebdo >= 10;
                    return (
                    <tr key={s.courtierId} className={`border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors ${quotaAtteint ? "bg-orange-500/5" : ""}`}>
                      <td className="p-3">
                        <div className="font-semibold text-white text-sm">{s.courtierNom}</div>
                        <div className="text-gray-500 text-xs">{s.courtierEmail}</div>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">{s.cabinetNom || "—"}</td>
                      <td className="p-3">
                        <Badge className={`text-xs border ${STATUT_COLORS[s.statutInterne] || ""}`}>
                          {STATUT_LABELS[s.statutInterne] || s.statutInterne}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {s.regions && s.regions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.regions.slice(0, 3).map((r: string) => (
                              <span key={r} className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-full px-2 py-0.5 text-xs">{r}</span>
                            ))}
                            {s.regions.length > 3 && <span className="text-gray-500 text-xs">+{s.regions.length - 3}</span>}
                          </div>
                        ) : <span className="text-gray-700 text-xs italic">Non renseigné</span>}
                      </td>
                      <td className="p-3 text-center">
                        {quotaAtteint ? (
                          <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded px-2 py-0.5 text-xs font-bold">
                            ⚠️ {s.hebdo}
                          </span>
                        ) : (
                          <span className={`font-bold text-sm ${s.hebdo > 0 ? "text-orange-400" : "text-gray-600"}`}>{s.hebdo || "—"}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-black text-lg ${s.total > 0 ? "text-[#C9A84C]" : "text-gray-600"}`}>{s.total}</span>
                      </td>
                      <td className="p-3 text-center">
                        {s.enAttente > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">{s.enAttente}</span>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        {s.enCours > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">{s.enCours}</span>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        {s.valide > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">{s.valide}</span>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        {s.refuse > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">{s.refuse}</span>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {statsCourtiers.length > 0 && (
              <p className="text-gray-600 text-xs text-right">
                Tri par nombre total de dossiers reçus (décroissant)
              </p>
            )}
          </>
        )}

        {/* ── Onglet Dossiers Courtage ── */}
        {activeTab === "dossiers" && (
          <>
            {/* Stats dossiers */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total", value: dossierStats.total, color: "text-white" },
                { label: "Nouveaux", value: dossierStats.nouveaux, color: "text-blue-400" },
                { label: "Envoyés", value: dossierStats.envoyes, color: "text-purple-400" },
                { label: "Validés", value: dossierStats.valides, color: "text-green-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#111] border border-gray-800 p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Rechercher un lead..."
                  value={dossierSearch}
                  onChange={(e) => setDossierSearch(e.target.value)}
                  className="bg-[#111] border-gray-700 text-white pl-9"
                />
              </div>
              <Select value={dossierStatut} onValueChange={setDossierStatut}>
                <SelectTrigger className="bg-[#111] border-gray-700 text-white w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-gray-700">
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="nouveau">Nouveaux</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="envoye">Envoyés</SelectItem>
                  <SelectItem value="valide">Validés</SelectItem>
                  <SelectItem value="refuse">Refusés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Liste dossiers */}
            <div className="space-y-2">
              {dossiers.length === 0 ? (
                <div className="bg-[#111] border border-gray-800 p-12 text-center">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                  <p className="text-gray-500">Aucun dossier de courtage reçu</p>
                  <p className="text-gray-600 text-xs mt-1">Les dossiers apparaissent ici quand les leads remplissent le Tableau de Courtage</p>
                </div>
              ) : (
                dossiers.map((d: any) => (
                  <DossierCourtageRow
                    key={d.id}
                    dossier={d}
                    courtiers={allCourtiers}
                    onRefetch={refetchDossiers}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
