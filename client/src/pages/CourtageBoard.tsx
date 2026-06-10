import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, Building2, CalendarDays, Mail, Phone, Download, Plus, Trash2, Star, ChevronDown, ChevronUp, FileText, Upload, Paperclip, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import LeadTimeline from "@/components/LeadTimeline";
import { AssigneeSelect } from "@/components/AssigneeSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourtageLead {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  statut: "actif" | "en_pause" | "cloture" | "perdu";
  courtierAssigne: string | null;
  courtierEmail: string | null;
  enveloppeValidee: number | null;
  enveloppeDate: string | null;
  leadId: number | null;
  mandatId: number | null;
  hexaId: number | null;
  formule: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  actif:    { label: "Actif",    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  en_pause: { label: "En pause", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cloture:  { label: "Clôturé",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  perdu:    { label: "Perdu",    color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const FORMULE_LABELS: Record<string, string> = {
  starter: "Starter",
  premium: "Premium",
  sdt_starter: "SDT Starter",
  sdt_premium: "SDT Premium",
};

function getCourtageStatus(lead: CourtageLead): { label: string; color: string; icon: React.ReactNode } {
  if (lead.enveloppeValidee) {
    return {
      label: `${lead.enveloppeValidee.toLocaleString("fr-FR")} €`,
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (lead.courtierAssigne) {
    return {
      label: "En cours",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: "À traiter",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  };
}

// ─── Composant fiche détail Courtage ─────────────────────────────────────────

// Labels et couleurs pour les réponses courtier
const REPONSE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  en_attente:   { label: "En attente",    color: "bg-zinc-700 text-zinc-300 border-zinc-600",           icon: "⏳" },
  ok_enveloppe: { label: "OK Enveloppe",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: "✅" },
  regroupement: { label: "Regroupement",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: "🔄" },
  refus:        { label: "Refus",         color: "bg-red-500/20 text-red-400 border-red-500/30",         icon: "❌" },
  sans_suite:   { label: "Sans suite",    color: "bg-zinc-600/50 text-zinc-400 border-zinc-600",         icon: "—" },
};

function CourtageDetail({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rawLead, isLoading } = trpc.crm.getById.useQuery({ id: leadId });

  // ─── Soumissions courtier ────────────────────────────────────────────────
  const { data: soumissions = [], refetch: refetchSoumissions } = trpc.courtierSoumissions.list.useQuery({ crmLeadId: leadId });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourtierNom, setNewCourtierNom] = useState("");
  const [newCourtierEmail, setNewCourtierEmail] = useState("");
  const [newCourtierCabinet, setNewCourtierCabinet] = useState("");
  const [newDateEnvoi, setNewDateEnvoi] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newResumeSituation, setNewResumeSituation] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [genTableauPdf, setGenTableauPdf] = useState(false);
  const [tableauPdfUrl, setTableauPdfUrl] = useState<string | null>(null);
  const [sendEmailOnAdd, setSendEmailOnAdd] = useState(true);

  const uploadZipMutation = trpc.courtierSoumissions.uploadZip.useMutation();
  const sendContactEmailMutation = trpc.courtierSoumissions.sendContactEmail.useMutation();
  const generatePdfMutation = trpc.dossier.generatePdf.useMutation({
    onSuccess: (data) => { setTableauPdfUrl(data.url); toast.success("Tableau de courtage généré !"); },
    onError: (e) => toast.error("Erreur génération PDF : " + e.message),
  });

  const resetAddForm = () => {
    setNewCourtierNom(""); setNewCourtierEmail(""); setNewCourtierCabinet("");
    setNewDateEnvoi(""); setNewNote(""); setNewResumeSituation("");
    setZipFile(null); setZipUrl(null); setTableauPdfUrl(null); setGenTableauPdf(false); setSendEmailOnAdd(true);
  };

  const handleZipSelect = async (file: File) => {
    setZipFile(file);
    setZipUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadZipMutation.mutateAsync({
        crmLeadId: leadId,
        fileBase64: base64,
        nom: file.name,
        mimeType: file.type || "application/zip",
      });
      setZipUrl(result.url);
      toast.success("Fichier uploadé !");
    } catch (e: any) {
      toast.error("Erreur upload : " + e.message);
    } finally {
      setZipUploading(false);
    }
  };

  const addSoumissionMutation = trpc.courtierSoumissions.add.useMutation({
    onSuccess: async () => {
      refetchSoumissions();
      setShowAddForm(false);
      // Envoyer l'email si demandé
      if (sendEmailOnAdd && newCourtierEmail) {
        try {
          await sendContactEmailMutation.mutateAsync({
            crmLeadId: leadId,
            courtierEmail: newCourtierEmail,
            courtierNom: newCourtierNom,
            resumeSituation: newResumeSituation || undefined,
            tableauCourtagePdfUrl: tableauPdfUrl || undefined,
            zipDocumentsUrl: zipUrl || undefined,
          });
          toast.success("Courtier ajouté et email envoyé !");
        } catch (e: any) {
          toast.success("Courtier ajouté");
          toast.error("Email non envoyé : " + e.message);
        }
      } else {
        toast.success("Courtier ajouté");
      }
      resetAddForm();
    },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const updateSoumissionMutation = trpc.courtierSoumissions.update.useMutation({
    onSuccess: () => { refetchSoumissions(); toast.success("Mis à jour"); },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const deleteSoumissionMutation = trpc.courtierSoumissions.delete.useMutation({
    onSuccess: () => { refetchSoumissions(); toast.success("Supprimé"); },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate({});
      utils.crm.getById.invalidate({ id: leadId });
      toast.success("Sauvegardé");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
  const sendDossierMutation = trpc.dossier.sendToCourtier.useMutation({
    onSuccess: () => toast.success("Dossier envoyé au courtier avec succès !"),
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const [courtierNom, setCourtierNom] = useState("");
  const [courtierEmail, setCourtierEmail] = useState("");
  const [enveloppe, setEnveloppe] = useState("");
  const [enveloppeDate, setEnveloppeDate] = useState("");
  const lead = rawLead as any;

  // Initialisation dans useEffect pour éviter setState pendant le render
  useEffect(() => {
    if (lead) {
      setCourtierNom(lead.courtierAssigne ?? "");
      setCourtierEmail((lead as any).courtierEmail ?? "");
      setEnveloppe(lead.enveloppeValidee ? String(lead.enveloppeValidee) : "");
      setEnveloppeDate(lead.enveloppeDate ?? "");
    }
  }, [lead?.id]);

  const handleSave = () => {
    updateMutation.mutate({
      id: leadId,
      courtierAssigne: courtierNom || undefined,
      courtierEmail: courtierEmail || undefined,
      enveloppeValidee: enveloppe ? parseInt(enveloppe) : undefined,
      enveloppeDate: enveloppeDate || undefined,
    } as any);
  };

  const handleSendDossier = () => {
    if (!courtierEmail || !courtierEmail.includes("@")) {
      toast.error("Veuillez saisir l'email du courtier avant d'envoyer.");
      return;
    }
    sendDossierMutation.mutate({
      crmLeadId: leadId,
      courtierEmail,
      courtierNom: courtierNom || undefined,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lead) return <p className="text-zinc-500 text-sm p-6">Lead introuvable.</p>;

  return (
    <div className="space-y-5">
      {/* Identité */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Identité du client</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Nom :</span>
            <span className="text-white font-medium">{lead.prenom} {lead.nom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300">{lead.email}</span>
          </div>
          {lead.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-300">{lead.telephone}</span>
            </div>
          )}
          {lead.formule && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Formule :</span>
              <span className="text-amber-400 font-medium">{FORMULE_LABELS[lead.formule] ?? lead.formule}</span>
            </div>
          )}
        </div>
        {/* Modules liés */}
        <div className="flex gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.leadId ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            État Civil {lead.leadId ? "✓" : "–"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.mandatId ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            Mandat {lead.mandatId ? "✓" : "–"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.hexaId ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            Crédit {lead.hexaId ? "✓" : "–"}
          </span>
        </div>
      </div>

      {/* Suivi courtage */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">Suivi Courtage</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Courtier assigné</label>
            <AssigneeSelect
              mode="courtier"
              value={courtierNom}
              leadVille={(lead as any)?.villeResidence}
              onChange={(val, option) => {
                setCourtierNom(val);
                if (option?.email) setCourtierEmail(option.email);
              }}
              placeholder="— Sélectionner un courtier —"
              className="w-full h-8"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Email du courtier</label>
            <Input
              value={courtierEmail}
              onChange={(e) => setCourtierEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm h-8"
              placeholder="courtier@cabinet.fr"
              type="email"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Enveloppe validée (€)</label>
            <Input
              value={enveloppe}
              onChange={(e) => setEnveloppe(e.target.value)}
              type="number"
              className="bg-zinc-800 border-zinc-700 text-sm h-8"
              placeholder="Ex. 350 000"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Date annonce enveloppe</label>
            <Input
              value={enveloppeDate}
              onChange={(e) => setEnveloppeDate(e.target.value)}
              type="date"
              className="bg-zinc-800 border-zinc-700 text-sm h-8"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="sm"
            className="bg-zinc-700 hover:bg-zinc-600 text-white h-8 px-4 text-xs"
          >
            {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button
            onClick={handleSendDossier}
            disabled={sendDossierMutation.isPending}
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-black font-semibold h-8 px-4 text-xs flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            {sendDossierMutation.isPending ? "Envoi..." : "Envoyer le dossier au courtier"}
          </Button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">L'envoi génère le PDF complet et le transmet au courtier + copie Manon</p>
      </div>

      {/* Tableau des soumissions courtier */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Courtiers contactés</h3>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-500 text-black font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Ajouter un courtier
          </Button>
        </div>

        {/* Formulaire d'ajout enrichi */}
        {showAddForm && (
          <div className="bg-zinc-800 rounded-lg p-4 mb-3 space-y-4 border border-zinc-700">
            {/* Identité courtier */}
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Courtier contacté</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Courtier du réseau *</label>
                  <AssigneeSelect
                    mode="courtier"
                    value={newCourtierNom}
                    leadVille={(lead as any)?.villeResidence}
                    onChange={(val, option) => {
                      setNewCourtierNom(val);
                      if (option?.email) setNewCourtierEmail(option.email);
                      if (option?.label) {
                        const parts = option.label.split(" — ");
                        if (parts.length > 1) setNewCourtierCabinet(parts[1]);
                      }
                    }}
                    placeholder="— Sélectionner un courtier —"
                    className="w-full h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Cabinet</label>
                  <Input value={newCourtierCabinet} onChange={e => setNewCourtierCabinet(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs h-7" placeholder="Cafpi, Meilleurtaux..." />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                  <Input value={newCourtierEmail} onChange={e => setNewCourtierEmail(e.target.value)} type="email" className="bg-zinc-700 border-zinc-600 text-xs h-7" placeholder="courtier@cabinet.fr" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Date d'envoi</label>
                  <Input value={newDateEnvoi} onChange={e => setNewDateEnvoi(e.target.value)} type="date" className="bg-zinc-700 border-zinc-600 text-xs h-7" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Note interne</label>
                  <Input value={newNote} onChange={e => setNewNote(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs h-7" placeholder="Remarques..." />
                </div>
              </div>
            </div>

            {/* Résumé de situation */}
            <div className="border-t border-zinc-700 pt-3">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Résumé de la situation client</p>
              <Textarea
                value={newResumeSituation}
                onChange={e => setNewResumeSituation(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs min-h-[80px] resize-none"
                placeholder="Décrivez la situation financière du client, son projet, ses revenus, ses contraintes... Ce texte sera inclus dans l'email envoyé au courtier."
              />
            </div>

            {/* Tableau de courtage PDF */}
            <div className="border-t border-zinc-700 pt-3">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Tableau de courtage</p>
              {(lead as any)?.leadId ? (
                <div className="flex items-center gap-2">
                  {tableauPdfUrl ? (
                    <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-500/30 rounded px-3 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-blue-300">PDF généré</span>
                      <a href={tableauPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">Voir</a>
                      <button onClick={() => setTableauPdfUrl(null)} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => generatePdfMutation.mutate({ leadId: (lead as any).leadId })}
                      disabled={generatePdfMutation.isPending}
                      className="h-7 px-3 text-xs bg-blue-700 hover:bg-blue-600 text-white flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3" />
                      {generatePdfMutation.isPending ? "Génération..." : "Générer le tableau de courtage PDF"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 italic">Fiche d'état civil requise pour générer le tableau de courtage.</p>
              )}
            </div>

            {/* Upload ZIP documents */}
            <div className="border-t border-zinc-700 pt-3">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Documents à joindre (ZIP)</p>
              {zipFile && zipUrl ? (
                <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded px-3 py-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-300 truncate max-w-[200px]">{zipFile.name}</span>
                  <span className="text-xs text-zinc-500">({(zipFile.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  <a href={zipUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline">Voir</a>
                  <button onClick={() => { setZipFile(null); setZipUrl(null); }} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ) : zipUploading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-3.5 h-3.5 border border-zinc-500 border-t-amber-400 rounded-full animate-spin" />
                  Upload en cours...
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-zinc-600 rounded px-3 py-2 hover:border-emerald-500/50 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Cliquer pour sélectionner un fichier ZIP ou PDF</span>
                  <input
                    type="file"
                    accept=".zip,.pdf,.rar"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleZipSelect(f); }}
                  />
                </label>
              )}
            </div>

            {/* Option envoi email */}
            <div className="border-t border-zinc-700 pt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="sendEmailOnAdd"
                checked={sendEmailOnAdd}
                onChange={e => setSendEmailOnAdd(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500"
              />
              <label htmlFor="sendEmailOnAdd" className="text-xs text-zinc-300 cursor-pointer">
                Envoyer l'email au courtier avec le résumé + documents
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => addSoumissionMutation.mutate({
                  crmLeadId: leadId,
                  courtierNom: newCourtierNom,
                  courtierEmail: newCourtierEmail || undefined,
                  courtierCabinet: newCourtierCabinet || undefined,
                  dateEnvoi: newDateEnvoi ? new Date(newDateEnvoi).getTime() : undefined,
                  note: newNote || undefined,
                  resumeSituation: newResumeSituation || undefined,
                  zipDocumentsUrl: zipUrl || undefined,
                  tableauCourtagePdfUrl: tableauPdfUrl || undefined,
                })}
                disabled={!newCourtierNom || addSoumissionMutation.isPending || sendContactEmailMutation.isPending}
                className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {addSoumissionMutation.isPending || sendContactEmailMutation.isPending ? "En cours..." : sendEmailOnAdd ? "Confirmer et envoyer" : "Confirmer"}
              </Button>
              <Button size="sm" onClick={() => { setShowAddForm(false); resetAddForm(); }} className="h-7 px-3 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Liste des soumissions */}
        {(soumissions as any[]).length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun courtier contacté pour ce dossier</p>
        ) : (
          <div className="space-y-2">
            {(soumissions as any[]).map((s: any) => {
              const cfg = REPONSE_CONFIG[s.reponse] ?? REPONSE_CONFIG.en_attente;
              const joursDepuis = s.dateEnvoi ? Math.floor((Date.now() - s.dateEnvoi) / 86400000) : null;
              return (
                <div key={s.id} className={`rounded-lg p-3 border ${s.selectionne ? "bg-emerald-950/40 border-emerald-500/40" : "bg-zinc-800 border-zinc-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.selectionne && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        <span className="text-sm font-medium text-white truncate">{s.courtierNom}</span>
                        {s.courtierCabinet && <span className="text-xs text-zinc-400">{s.courtierCabinet}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {s.reponse === "ok_enveloppe" && s.montantEnveloppe && (
                          <span className="text-xs text-emerald-300 font-semibold">{s.montantEnveloppe.toLocaleString("fr-FR")} €</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        {s.courtierEmail && <span>{s.courtierEmail}</span>}
                        {joursDepuis !== null && (
                          <span className={joursDepuis > 7 ? "text-amber-400" : ""}>
                            Envoyé il y a {joursDepuis === 0 ? "aujourd'hui" : `${joursDepuis}j`}
                          </span>
                        )}
                        {s.note && <span className="italic text-zinc-500 truncate max-w-[200px]">{s.note}</span>}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={s.reponse}
                        onChange={e => updateSoumissionMutation.mutate({ id: s.id, reponse: e.target.value as any })}
                        className="text-xs bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-300 h-6"
                      >
                        <option value="en_attente">⏳ En attente</option>
                        <option value="ok_enveloppe">✅ OK Enveloppe</option>
                        <option value="regroupement">🔄 Regroupement</option>
                        <option value="refus">❌ Refus</option>
                        <option value="sans_suite">— Sans suite</option>
                      </select>
                      {s.reponse === "ok_enveloppe" && (
                        <input
                          type="number"
                          placeholder="Montant €"
                          defaultValue={s.montantEnveloppe ?? ""}
                          onBlur={e => { if (e.target.value) updateSoumissionMutation.mutate({ id: s.id, montantEnveloppe: parseInt(e.target.value) }); }}
                          className="text-xs bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-300 h-6 w-24"
                        />
                      )}
                      <button
                        onClick={() => updateSoumissionMutation.mutate({ id: s.id, selectionne: !s.selectionne })}
                        title={s.selectionne ? "Désélectionner" : "Marquer comme courtier retenu"}
                        className={`p-1 rounded transition-colors ${s.selectionne ? "text-amber-400 hover:text-zinc-400" : "text-zinc-600 hover:text-amber-400"}`}
                      >
                        <Star className="w-3.5 h-3.5" fill={s.selectionne ? "currentColor" : "none"} />
                      </button>
                      {s.courtierEmail && (
                        <button
                          onClick={() => {
                            if (!confirm(`Envoyer le dossier à ${s.courtierNom} (${s.courtierEmail}) ?`)) return;
                            sendDossierMutation.mutate({
                              crmLeadId: leadId,
                              courtierEmail: s.courtierEmail!,
                              courtierNom: s.courtierNom,
                            });
                          }}
                          disabled={sendDossierMutation.isPending}
                          title={`Envoyer le dossier à ${s.courtierNom}`}
                          className="p-1 rounded text-zinc-600 hover:text-amber-400 transition-colors disabled:opacity-40"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm("Supprimer cette soumission ?")) deleteSoumissionMutation.mutate({ id: s.id }); }}
                        className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline des activités */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <LeadTimeline crmLeadId={leadId} nomLead={lead ? `${lead.prenom} ${lead.nom}` : undefined} />
      </div>

      {/* Notes */}
      {lead.notes && Array.isArray(lead.notes) && lead.notes.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Dernières notes</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(lead.notes as any[]).slice(0, 5).map((note: any) => (
              <div key={note.id} className="text-xs bg-zinc-800 rounded-lg p-3">
                <div className="flex justify-between text-zinc-500 mb-1">
                  <span>{note.auteur ?? "Équipe"}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-zinc-300">{note.contenu}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant carte lead ─────────────────────────────────────────────────────

function CourtageCard({ lead, onClick }: { lead: CourtageLead; onClick: () => void }) {
  const status = getCourtageStatus(lead);
  const statutCfg = STATUT_CONFIG[lead.statut] ?? STATUT_CONFIG.actif;

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-purple-500/40 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors">
            {lead.prenom} {lead.nom}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{lead.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statutCfg.color}`}>
            {statutCfg.label}
          </span>
        </div>
      </div>

      {/* Courtier */}
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        {lead.courtierAssigne ? (
          <span className="text-xs text-zinc-300 truncate">{lead.courtierAssigne}</span>
        ) : (
          <span className="text-xs text-zinc-600 italic">Aucun courtier assigné</span>
        )}
      </div>

      {/* Enveloppe */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${status.color}`}>
        {status.icon}
        <span>
          {lead.enveloppeValidee
            ? `Enveloppe : ${lead.enveloppeValidee.toLocaleString("fr-FR")} €`
            : lead.courtierAssigne
            ? "Enveloppe en attente"
            : "À traiter"}
        </span>
      </div>

      {/* Date enveloppe */}
      {lead.enveloppeDate && (
        <div className="flex items-center gap-1.5 mt-2">
          <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            Annonce : {new Date(lead.enveloppeDate).toLocaleDateString("fr-FR")}
          </span>
        </div>
      )}

      {/* Formule */}
      {lead.formule && (
        <p className="text-xs text-amber-400/70 mt-2">{FORMULE_LABELS[lead.formule] ?? lead.formule}</p>
      )}

      <p className="text-xs text-zinc-700 mt-2">
        Entré le {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// ─── Composant Réseau Courtiers ─────────────────────────────────────────────

function ReseauCourtiers() {
  const { data: stats, isLoading } = trpc.courtierSoumissions.statsReseau.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucun courtier contacté pour l'instant.</p>
        <p className="text-xs mt-1 text-zinc-700">Les courtiers apparaîtront ici dès qu'un dossier leur sera soumis.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🤝</span> Réseau courtiers
          </h2>
          <p className="text-zinc-500 text-sm mt-1">{stats.length} courtier{stats.length > 1 ? 's' : ''} contacté{stats.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Courtiers contactés", value: stats.length, color: "text-white", bg: "bg-zinc-900 border-zinc-800" },
          { label: "Accords enveloppe", value: stats.reduce((s, c) => s + c.okEnveloppe, 0), color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
          { label: "Refus", value: stats.reduce((s, c) => s + c.refus, 0), color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
          { label: "En attente", value: stats.reduce((s, c) => s + c.enAttente, 0), color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl p-4 border ${kpi.bg}`}>
            <p className="text-xs text-zinc-500 mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tableau des courtiers */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Courtier</th>
              <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Cabinet</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">Total</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">⏳ Attente</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">✅ Accord</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">🔄 Regroupement</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">❌ Refus</th>
              <th className="text-center text-xs text-zinc-500 font-medium pb-3 pr-4">⭐ Sélectionné</th>
              <th className="text-left text-xs text-zinc-500 font-medium pb-3">Taux accord</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((c, i) => {
              const traites = c.okEnveloppe + c.regroupement + c.refus + c.sansSuite;
              const tauxAccord = traites > 0 ? Math.round((c.okEnveloppe / traites) * 100) : null;
              return (
                <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{c.courtierNom}</p>
                    {c.courtierEmail && <p className="text-xs text-zinc-500">{c.courtierEmail}</p>}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 text-xs">{c.courtierCabinet ?? '—'}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className="text-white font-bold">{c.total}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-sm font-medium ${c.enAttente > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>{c.enAttente}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-sm font-medium ${c.okEnveloppe > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>{c.okEnveloppe}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-sm font-medium ${c.regroupement > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{c.regroupement}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-sm font-medium ${c.refus > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{c.refus}</span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    {c.selectionne > 0 ? (
                      <span className="text-amber-400 font-bold">{c.selectionne} ⭐</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {tauxAccord !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5 max-w-20">
                          <div
                            className={`h-1.5 rounded-full ${
                              tauxAccord >= 60 ? 'bg-emerald-500' :
                              tauxAccord >= 30 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${tauxAccord}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          tauxAccord >= 60 ? 'text-emerald-400' :
                          tauxAccord >= 30 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>{tauxAccord}%</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">En cours</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CourtageBoard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "actif" | "en_pause" | "cloture" | "perdu">("tous");
  const [filterEnveloppe, setFilterEnveloppe] = useState<"tous" | "avec" | "sans">("tous");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "reseau">("leads");

  const exportCSV = () => {
    const rows = [
      ["Prénom", "Nom", "Email", "Téléphone", "Statut", "Courtier", "Email courtier", "Enveloppe (€)", "Date annonce", "Formule", "Dernière action"],
      ...filtered.map((l) => [
        l.prenom,
        l.nom,
        l.email,
        l.telephone ?? "",
        l.statut,
        l.courtierAssigne ?? "",
        l.courtierEmail ?? "",
        l.enveloppeValidee ? String(l.enveloppeValidee) : "",
        l.enveloppeDate ?? "",
        l.formule ?? "",
        new Date(l.updatedAt).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courtage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: rawLeads, isLoading, refetch } = trpc.crm.list.useQuery({
    etape: "courtage",
    limit: 200,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const leads: CourtageLead[] = ((rawLeads as any)?.items ?? []) as CourtageLead[];

  // Filtres
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.nom.toLowerCase().includes(q)
      || l.prenom.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.courtierAssigne ?? "").toLowerCase().includes(q);
    const matchStatut = filterStatut === "tous" || l.statut === filterStatut;
    const matchEnveloppe =
      filterEnveloppe === "tous"
      || (filterEnveloppe === "avec" && !!l.enveloppeValidee)
      || (filterEnveloppe === "sans" && !l.enveloppeValidee);
    return matchSearch && matchStatut && matchEnveloppe;
  });

  // Statistiques
  const total = leads.length;
  const avecEnveloppe = leads.filter((l) => !!l.enveloppeValidee).length;
  const avecCourtier = leads.filter((l) => !!l.courtierAssigne).length;
  const aTraiter = leads.filter((l) => !l.courtierAssigne).length;
  const enveloppeTotal = leads
    .filter((l) => !!l.enveloppeValidee)
    .reduce((sum, l) => sum + (l.enveloppeValidee ?? 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Onglets */}
        <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "leads"
                ? "bg-amber-600 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🏦 Suivi leads
          </button>
          <button
            onClick={() => setActiveTab("reseau")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "reseau"
                ? "bg-amber-600 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🤝 Réseau courtiers
          </button>
        </div>

        {activeTab === "reseau" && <ReseauCourtiers />}
        {activeTab === "leads" && <>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-2xl">🏦</span>
              Suivi Courtage — Manon
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Tous les leads en étape Courtage · Mise à jour en temps réel
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportCSV}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-white h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => refetch()}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-white h-8 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total leads", value: total, color: "text-white", bg: "bg-zinc-900 border-zinc-800" },
            { label: "À traiter", value: aTraiter, color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
            { label: "Courtier assigné", value: avecCourtier, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
            { label: "Enveloppe validée", value: avecEnveloppe, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
            {
              label: "Total enveloppes",
              value: enveloppeTotal > 0 ? `${enveloppeTotal.toLocaleString("fr-FR")} €` : "—",
              color: "text-purple-400",
              bg: "bg-purple-500/5 border-purple-500/20",
            },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl p-4 border ${kpi.bg}`}>
              <p className="text-xs text-zinc-500 mb-1">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un lead ou courtier..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-sm h-9"
            />
          </div>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 h-9"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="en_pause">En pause</option>
            <option value="cloture">Clôturé</option>
            <option value="perdu">Perdu</option>
          </select>
          <select
            value={filterEnveloppe}
            onChange={(e) => setFilterEnveloppe(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 h-9"
          >
            <option value="tous">Toutes les enveloppes</option>
            <option value="avec">Enveloppe validée</option>
            <option value="sans">Sans enveloppe</option>
          </select>
        </div>

        {/* Résultats */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {leads.length === 0
                ? "Aucun lead en étape Courtage pour l'instant."
                : "Aucun résultat pour ces filtres."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-600 mb-4">
              {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            </p>

            {/* Vue tableau (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Client</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Statut</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Courtier assigné</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Enveloppe</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Date annonce</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Dernière action</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3">Modules</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const status = getCourtageStatus(lead);
                    const statutCfg = STATUT_CONFIG[lead.statut] ?? STATUT_CONFIG.actif;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white group-hover:text-purple-300 transition-colors">
                            {lead.prenom} {lead.nom}
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-48">{lead.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statutCfg.color}`}>
                            {statutCfg.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {lead.courtierAssigne ? (
                            <div>
                              <p className="text-white text-xs font-medium">{lead.courtierAssigne}</p>
                              {lead.courtierEmail && (
                                <p className="text-zinc-500 text-xs truncate max-w-40">{lead.courtierEmail}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Non assigné</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                            {status.icon}
                            {lead.enveloppeValidee
                              ? `${lead.enveloppeValidee.toLocaleString("fr-FR")} €`
                              : lead.courtierAssigne ? "En cours" : "À traiter"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {lead.enveloppeDate ? (
                            <span className="text-xs text-zinc-400">
                              {new Date(lead.enveloppeDate).toLocaleDateString("fr-FR")}
                            </span>
                          ) : (
                            <span className="text-zinc-700 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {lead.updatedAt ? (() => {
                            const diff = Date.now() - new Date(lead.updatedAt).getTime();
                            const days = Math.floor(diff / 86400000);
                            return (
                              <span className={`text-xs ${
                                days >= 7 ? "text-red-400" :
                                days >= 3 ? "text-amber-400" :
                                "text-zinc-400"
                              }`}>
                                {days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : `Il y a ${days}j`}
                              </span>
                            );
                          })() : <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.leadId ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              EC
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.mandatId ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              M
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.hexaId ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              H
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vue cartes (mobile) */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filtered.map((lead) => (
                <CourtageCard key={lead.id} lead={lead} onClick={() => setSelectedLeadId(lead.id)} />
              ))}
            </div>
          </>
        )}

      </> /* fin onglet leads */}
      </div>

      {/* Modal fiche détail */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) setSelectedLeadId(null); }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Suivi Courtage
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && (
            <CourtageDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
