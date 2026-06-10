import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, TrendingUp, CheckCircle, Clock, Plus, Users, Star, FileText, ArrowLeft } from "lucide-react";
import AdminNav from "@/components/AdminNav";

const STATUT_COLORS: Record<string, string> = {
  a_payer: "border-yellow-500/30 text-yellow-400",
  facture_recue: "border-blue-500/30 text-blue-400",
  paye: "border-green-500/30 text-green-400",
};

const STATUT_LABELS: Record<string, string> = {
  a_payer: "À payer", facture_recue: "Facture reçue", paye: "Payée",
};

const NIVEAU_LABELS: Record<string, string> = {
  "0": "Direct", "1": "N1 — 10%", "2": "N2 — 5%",
};

export default function CommissionsDashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("all");
  const [form, setForm] = useState({
    ambassadeurId: "",
    commissionSigmaHt: "",
    descriptionVente: "",
    dateEncaissement: new Date().toISOString().split("T")[0],
    reference: "",
  });

  const { data: commissions } = trpc.ambassadeurs.listCommissions.useQuery(
    filtreStatut !== "all" ? { statut: filtreStatut } : undefined
  );
  const { data: statsData } = trpc.ambassadeurs.stats.useQuery();
  const { data: ambassadeursList } = trpc.ambassadeurs.list.useQuery({ statut: "actif" });

  const utils = trpc.useUtils();

  const creerCommission = trpc.ambassadeurs.creerCommission.useMutation({
    onSuccess: () => {
      setShowAddDialog(false);
      setForm({ ambassadeurId: "", commissionSigmaHt: "", descriptionVente: "", dateEncaissement: new Date().toISOString().split("T")[0], reference: "" });
      utils.ambassadeurs.listCommissions.invalidate();
      utils.ambassadeurs.stats.invalidate();
    },
  });

  const validerCommission = trpc.ambassadeurs.validerCommission.useMutation({
    onSuccess: () => utils.ambassadeurs.listCommissions.invalidate(),
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const commSigma = parseFloat(form.commissionSigmaHt) || 0;
  const commN1 = commSigma * 0.10;
  const commN2 = commSigma * 0.05;

  // Stats calculées depuis la liste
  const totalAPayer = commissions?.filter((c: any) => c.statut === "a_payer").reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0) ?? 0;
  const totalPaye = commissions?.filter((c: any) => c.statut === "paye").reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0) ?? 0;
  const totalCommissions = commissions?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminNav />
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard/reseau" className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#C9A84C] transition-colors" title="Retour Réseau">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              Commissions <span className="text-[#C9A84C]">Agents</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Suivi des rétrocommissions N1 (10%) et N2 (5%)</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
        >
          <Plus className="mr-2 w-4 h-4" /> Enregistrer une vente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total versé", value: `${totalPaye.toLocaleString("fr-FR")} €`, icon: CheckCircle, color: "text-green-400" },
          { label: "En attente de versement", value: `${totalAPayer.toLocaleString("fr-FR")} €`, icon: Clock, color: "text-yellow-400" },
          { label: "Lignes de commission", value: totalCommissions, icon: FileText, color: "text-[#C9A84C]" },
          { label: "Agents actifs", value: statsData?.actifs ?? 0, icon: Users, color: "text-blue-400" },
        ].map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#222] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-48 bg-[#111] border-[#222] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-[#333]">
            <SelectItem value="all" className="text-white">Toutes les commissions</SelectItem>
            <SelectItem value="a_payer" className="text-white">À payer</SelectItem>
            <SelectItem value="facture_recue" className="text-white">Facture reçue</SelectItem>
            <SelectItem value="paye" className="text-white">Payées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#222] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Agent</th>
              <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Description</th>
              <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Comm. Sigma HT</th>
              <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Montant HT</th>
              <th className="text-center p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Niveau</th>
              <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Statut</th>
              <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!commissions?.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  <Euro className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Aucune commission enregistrée</p>
                  <p className="text-xs mt-1">Enregistrez une vente pour générer les rétrocommissions automatiquement</p>
                </td>
              </tr>
            ) : commissions.map((comm: any) => (
              <tr key={comm.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                <td className="p-3">
                  <p className="text-white font-medium text-xs">Amb. #{comm.ambassadeurId}</p>
                  <p className="text-gray-500 text-xs">{comm.reference}</p>
                </td>
                <td className="p-3">
                  <p className="text-gray-300 text-xs max-w-48 truncate">{comm.descriptionVente ?? "—"}</p>
                  <p className="text-gray-500 text-xs">{comm.dateEncaissement}</p>
                </td>
                <td className="p-3 text-right">
                  <p className="text-white font-semibold">{comm.commissionSigmaHt?.toLocaleString("fr-FR")} €</p>
                </td>
                <td className="p-3 text-right">
                  <p className={`font-black text-lg ${comm.niveau === "1" ? "text-[#C9A84C]" : comm.niveau === "2" ? "text-blue-400" : "text-green-400"}`}>
                    {comm.montantHt?.toLocaleString("fr-FR")} €
                  </p>
                  <p className="text-gray-500 text-xs">{comm.tauxPourcent}%</p>
                </td>
                <td className="p-3 text-center">
                  <Badge className={`text-xs border ${comm.niveau === "1" ? "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30" : comm.niveau === "2" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"}`}>
                    {NIVEAU_LABELS[comm.niveau]}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge className={`text-xs border bg-transparent ${STATUT_COLORS[comm.statut] ?? ""}`}>
                    {STATUT_LABELS[comm.statut]}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  {comm.statut !== "paye" && (
                    <Button
                      size="sm"
                      onClick={() => validerCommission.mutate({ id: comm.id })}
                      className="h-7 text-xs bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                    >
                      <CheckCircle className="mr-1 w-3 h-3" /> Marquer payée
                    </Button>
                  )}
                  {comm.statut === "paye" && comm.valideParNom && (
                    <p className="text-gray-500 text-xs">Validé par {comm.valideParNom}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog ajouter vente */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#111] border border-[#222] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-black">Enregistrer une vente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Agent *</Label>
              <Select value={form.ambassadeurId} onValueChange={v => set("ambassadeurId", v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white">
                  <SelectValue placeholder="Sélectionner un agent" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#333]">
                  {ambassadeursList?.map((amb: any) => (
                    <SelectItem key={amb.id} value={String(amb.id)} className="text-white">
                      {amb.prenom} {amb.nom} — N{amb.niveau}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Commission Sigma HT (€) *</Label>
                <Input
                  type="number"
                  value={form.commissionSigmaHt}
                  onChange={e => set("commissionSigmaHt", e.target.value)}
                  placeholder="8750"
                  className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Date d'encaissement *</Label>
                <Input
                  type="date"
                  value={form.dateEncaissement}
                  onChange={e => set("dateEncaissement", e.target.value)}
                  className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]"
                />
              </div>
            </div>

            {/* Calcul automatique */}
            {commSigma > 0 && (
              <div className="bg-[#0d0d0d] border border-[#C9A84C]/20 p-4 space-y-2">
                <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Rétrocommissions calculées automatiquement</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="border border-[#C9A84C]/30 p-3 text-center">
                    <p className="text-[#C9A84C] text-xl font-black">{commN1.toLocaleString("fr-FR")} €</p>
                    <p className="text-gray-400 text-xs mt-1">Agent N1 (10%)</p>
                  </div>
                  <div className="border border-blue-500/30 p-3 text-center">
                    <p className="text-blue-400 text-xl font-black">{commN2.toLocaleString("fr-FR")} €</p>
                    <p className="text-gray-400 text-xs mt-1">Parrain N2 (5%)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Description de la vente</Label>
              <Input
                value={form.descriptionVente}
                onChange={e => set("descriptionVente", e.target.value)}
                placeholder="Appartement T3 Lyon 3ème — Vente directe"
                className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Référence interne</Label>
              <Input
                value={form.reference}
                onChange={e => set("reference", e.target.value)}
                placeholder="VENTE-2026-001"
                className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-[#333] text-gray-400">
                Annuler
              </Button>
              <Button
                disabled={!form.ambassadeurId || !form.commissionSigmaHt || !form.dateEncaissement || creerCommission.isPending}
                onClick={() => creerCommission.mutate({
                  ambassadeurId: parseInt(form.ambassadeurId),
                  commissionSigmaHt: parseFloat(form.commissionSigmaHt),
                  dateEncaissement: form.dateEncaissement,
                  descriptionVente: form.descriptionVente || undefined,
                  reference: form.reference || undefined,
                })}
                className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
              >
                {creerCommission.isPending ? "Enregistrement..." : "Enregistrer et calculer les commissions"}
              </Button>
            </div>

            {creerCommission.isError && (
              <p className="text-red-400 text-xs">{creerCommission.error.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
