import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Calendar, ArrowRight, FileText, Phone, Clock, Plus, Trash2, ChevronDown, ChevronUp
} from "lucide-react";

type ActivityType = "note" | "email_envoye" | "rdv_pris" | "rdv_confirme" | "etape_changee" | "champ_modifie" | "document" | "appel" | "autre";

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  note:          { label: "Note",            icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  email_envoye:  { label: "Email envoyé",    icon: <Mail className="w-3.5 h-3.5" />,          color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  rdv_pris:      { label: "RDV pris",        icon: <Calendar className="w-3.5 h-3.5" />,      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  rdv_confirme:  { label: "RDV confirmé",    icon: <Calendar className="w-3.5 h-3.5" />,      color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/30" },
  etape_changee: { label: "Étape changée",   icon: <ArrowRight className="w-3.5 h-3.5" />,    color: "text-[#C9A84C]",  bg: "bg-[#C9A84C]/10 border-[#C9A84C]/30" },
  champ_modifie: { label: "Mise à jour",     icon: <FileText className="w-3.5 h-3.5" />,      color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30" },
  document:      { label: "Document",        icon: <FileText className="w-3.5 h-3.5" />,      color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  appel:         { label: "Appel",           icon: <Phone className="w-3.5 h-3.5" />,         color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/30" },
  autre:         { label: "Autre",           icon: <Clock className="w-3.5 h-3.5" />,         color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30" },
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface LeadTimelineProps {
  crmLeadId: number;
  nomLead?: string;
}

export default function LeadTimeline({ crmLeadId, nomLead }: LeadTimelineProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState<ActivityType>("note");
  const [noteTitre, setNoteTitre] = useState("");
  const [noteContenu, setNoteContenu] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: activities, refetch } = trpc.crm.getActivities.useQuery(
    { crmLeadId },
    { enabled: !!crmLeadId }
  );

  const addMutation = trpc.crm.addActivity.useMutation({
    onSuccess: () => {
      toast.success("Activité ajoutée");
      setShowForm(false);
      setNoteTitre("");
      setNoteContenu("");
      setNoteType("note");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.crm.deleteActivity.useMutation({
    onSuccess: () => { toast.success("Activité supprimée"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!noteTitre.trim()) { toast.error("Le titre est requis"); return; }
    addMutation.mutate({
      crmLeadId,
      type: noteType,
      auteur: user?.name ?? "Équipe",
      titre: noteTitre.trim(),
      contenu: noteContenu.trim() || undefined,
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canDelete = user?.role === "admin" || user?.role === "direction";

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Timeline</span>
          {activities && (
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{activities.length}</span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(v => !v)}
          className="h-7 px-2.5 text-xs bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold gap-1"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-[#0d0d0d] border border-[#C9A84C]/30 p-3 mb-4 rounded-sm">
          <div className="flex gap-2 mb-2">
            <Select value={noteType} onValueChange={(v) => setNoteType(v as ActivityType)}>
              <SelectTrigger className="h-8 text-xs bg-[#111] border-gray-700 text-white w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-gray-700">
                {(Object.entries(TYPE_CONFIG) as [ActivityType, typeof TYPE_CONFIG[ActivityType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs text-white">
                    <span className="flex items-center gap-1.5">
                      <span className={cfg.color}>{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="text"
              placeholder="Titre de l'activité *"
              value={noteTitre}
              onChange={e => setNoteTitre(e.target.value)}
              className="flex-1 h-8 text-xs bg-[#111] border border-gray-700 text-white px-2 rounded-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <Textarea
            placeholder="Détails (optionnel)..."
            value={noteContenu}
            onChange={e => setNoteContenu(e.target.value)}
            className="text-xs bg-[#111] border-gray-700 text-white resize-none h-20 mb-2"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs text-gray-400">
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="h-7 text-xs bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold"
            >
              {addMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!activities || activities.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-xs">
          Aucune activité enregistrée pour ce lead
        </div>
      ) : (
        <div className="relative">
          {/* Ligne verticale */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-800" />
          <div className="flex flex-col gap-0">
            {activities.map((activity, idx) => {
              const cfg = TYPE_CONFIG[activity.type as ActivityType] ?? TYPE_CONFIG.autre;
              const isExpanded = expandedIds.has(activity.id);
              const hasContenu = !!activity.contenu;
              return (
                <div key={activity.id} className="relative flex gap-3 pb-4">
                  {/* Dot */}
                  <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-white font-medium truncate">{activity.titre}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">{formatDate(activity.createdAt)}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-[#C9A84C] font-medium">{activity.auteur}</span>
                        </div>
                        {/* Contenu expandable */}
                        {hasContenu && (
                          <>
                            {isExpanded && (
                              <div className="mt-1.5 text-xs text-gray-400 bg-[#0a0a0a] border border-gray-800 p-2 rounded-sm whitespace-pre-wrap">
                                {activity.contenu}
                              </div>
                            )}
                            <button
                              onClick={() => toggleExpand(activity.id)}
                              className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-300 mt-0.5"
                            >
                              {isExpanded ? <><ChevronUp className="w-3 h-3" /> Masquer</> : <><ChevronDown className="w-3 h-3" /> Voir détails</>}
                            </button>
                          </>
                        )}
                        {/* Meta */}
                        {activity.meta && (
                          <div className="mt-1 text-[10px] text-gray-600 italic">{activity.meta}</div>
                        )}
                      </div>
                      {/* Bouton supprimer (admin/direction) */}
                      {canDelete && (
                        <button
                          onClick={() => deleteMutation.mutate({ id: activity.id })}
                          className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors mt-0.5"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
