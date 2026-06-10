/**
 * AvisPipe — Tableau de bord Marie
 * Pipe Avis & Témoignages (4 étapes : Avis à faire / Avis effectué / En montage / Montage OK)
 * Fonctionnalités : notes libres inline, filtres par source (Courtage / Immo / Tous)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import {
  CheckCircle2, Clock, Star, Layers, ChevronRight,
  RefreshCw, Trash2, Phone, Mail, Pencil, Check, X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Étapes du pipe ──────────────────────────────────────────────────────────

const ETAPES = [
  {
    id: "avis_a_faire" as const,
    label: "Avis à faire",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
    badge: "bg-amber-400/20 text-amber-300",
  },
  {
    id: "avis_effectue" as const,
    label: "Avis effectué",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
    badge: "bg-emerald-400/20 text-emerald-300",
  },
  {
    id: "en_montage" as const,
    label: "En montage",
    icon: Layers,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    badge: "bg-blue-400/20 text-blue-300",
  },
  {
    id: "montage_ok" as const,
    label: "Montage OK",
    icon: Star,
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/30",
    badge: "bg-purple-400/20 text-purple-300",
  },
] as const;

type EtapeId = typeof ETAPES[number]["id"];
type SourceFilter = "tous" | "courtage" | "immo";

// ─── Composant carte ─────────────────────────────────────────────────────────

function AvisCard({
  item,
  onEtapeChange,
  onDelete,
  onNotesSaved,
  isAdmin,
}: {
  item: any;
  onEtapeChange: (id: number, etape: EtapeId) => void;
  onDelete: (id: number) => void;
  onNotesSaved: (id: number, notes: string) => void;
  isAdmin: boolean;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? "");

  const etapeActuelle = ETAPES.find(e => e.id === item.etape);
  const etapeIdx = ETAPES.findIndex(e => e.id === item.etape);
  const etapeSuivante = ETAPES[etapeIdx + 1];
  const sourceLabel = item.etapeSource === "courtage" ? "Courtage — Manon" : "Immo — Élodie";
  const sourceBadge = item.etapeSource === "courtage"
    ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";

  const handleSaveNotes = () => {
    onNotesSaved(item.id, notesValue);
    setEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesValue(item.notes ?? "");
    setEditingNotes(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{item.leadNom}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${sourceBadge}`}>
            {sourceLabel}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${etapeActuelle?.badge}`}>
          {etapeActuelle?.label}
        </span>
      </div>

      {/* Coordonnées */}
      <div className="flex flex-col gap-1">
        {item.leadEmail && (
          <a href={`mailto:${item.leadEmail}`} className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 text-xs transition-colors">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.leadEmail}</span>
          </a>
        )}
        {item.leadTelephone && (
          <a href={`tel:${item.leadTelephone}`} className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 text-xs transition-colors">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{item.leadTelephone}</span>
          </a>
        )}
      </div>

      {/* Notes libres */}
      <div className="border-t border-zinc-800 pt-2">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Ton du client, plateforme d'avis (Google, Trustpilot…), disponibilité..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 resize-none placeholder:text-zinc-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Check className="w-3 h-3" /> Enregistrer
              </button>
              <button
                onClick={handleCancelNotes}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 transition-colors"
              >
                <X className="w-3 h-3" /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <div
            className="group cursor-pointer"
            onClick={() => setEditingNotes(true)}
          >
            {notesValue ? (
              <div className="flex items-start gap-2">
                <p className="text-zinc-400 text-xs leading-relaxed flex-1">{notesValue}</p>
                <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                <Pencil className="w-3 h-3" />
                <span className="text-xs italic">Ajouter une note...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
        {etapeSuivante && (
          <button
            onClick={() => onEtapeChange(item.id, etapeSuivante.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            {etapeSuivante.label}
          </button>
        )}
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Date */}
      <p className="text-zinc-600 text-xs">
        Ajouté le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function AvisPipe() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "direction";
  const utils = trpc.useUtils();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("tous");

  const { data: items = [], isLoading, refetch } = trpc.marie.listAvisPipe.useQuery();

  const updateEtape = trpc.marie.updateEtapeAvis.useMutation({
    onSuccess: () => utils.marie.listAvisPipe.invalidate(),
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const updateNotes = trpc.marie.updateEtapeAvis.useMutation({
    onSuccess: () => {
      utils.marie.listAvisPipe.invalidate();
      toast.success("Note enregistrée !");
    },
    onError: (e) => toast.error("Erreur sauvegarde note : " + e.message),
  });

  const deleteEntry = trpc.marie.deleteAvisEntry.useMutation({
    onSuccess: () => utils.marie.listAvisPipe.invalidate(),
    onError: (e) => toast.error("Erreur suppression : " + e.message),
  });

  const handleEtapeChange = (id: number, etape: EtapeId) => {
    updateEtape.mutate({ id, etape });
  };

  const handleNotesSaved = (id: number, notes: string) => {
    const item = (items as any[]).find((i: any) => i.id === id);
    if (!item) return;
    updateNotes.mutate({ id, etape: item.etape, notes });
  };

  const handleDelete = (id: number) => {
    if (confirm("Supprimer cette entrée du pipe avis ?")) {
      deleteEntry.mutate({ id });
    }
  };

  // Filtrage par source
  const filteredItems = (items as any[]).filter((i: any) =>
    sourceFilter === "tous" ? true : i.etapeSource === sourceFilter
  );

  // Compteurs pour les badges de filtre
  const countCourtage = (items as any[]).filter((i: any) => i.etapeSource === "courtage").length;
  const countImmo = (items as any[]).filter((i: any) => i.etapeSource === "immo").length;

  const SOURCE_FILTERS: { id: SourceFilter; label: string; count: number; color: string }[] = [
    { id: "tous", label: "Tous", count: (items as any[]).length, color: "border-zinc-600 text-zinc-300 bg-zinc-800 hover:border-zinc-500" },
    { id: "courtage", label: "Courtage", count: countCourtage, color: "border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20" },
    { id: "immo", label: "Immo", count: countImmo, color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Pipe Avis & Témoignages</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {filteredItems.length} dossier{filteredItems.length !== 1 ? "s" : ""}
              {sourceFilter !== "tous" && ` — ${sourceFilter === "courtage" ? "Courtage" : "Immo"}`}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Filtres par source */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setSourceFilter(f.id)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all ${
                sourceFilter === f.id
                  ? f.color + " ring-1 ring-offset-1 ring-offset-zinc-950 ring-current"
                  : f.color + " opacity-60"
              }`}
            >
              {f.label}
              <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">{f.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg font-medium">Aucun dossier dans le pipe</p>
            <p className="text-zinc-600 text-sm mt-2">
              {sourceFilter === "tous"
                ? "Les dossiers apparaissent ici quand Manon ou Élodie vous assignent depuis le Pipeline CRM."
                : `Aucun dossier pour la source "${sourceFilter === "courtage" ? "Courtage" : "Immo"}".`}
            </p>
          </div>
        ) : (
          /* Kanban 4 colonnes */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ETAPES.map(etape => {
              const Icon = etape.icon;
              const colItems = filteredItems.filter((i: any) => i.etape === etape.id);
              return (
                <div key={etape.id} className={`rounded-xl border p-4 ${etape.bg}`}>
                  {/* En-tête colonne */}
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={`w-4 h-4 ${etape.color}`} />
                    <span className={`font-semibold text-sm ${etape.color}`}>{etape.label}</span>
                    <span className="ml-auto text-xs text-zinc-500 font-medium">{colItems.length}</span>
                  </div>

                  {/* Cartes */}
                  <div className="flex flex-col gap-3">
                    {colItems.length === 0 ? (
                      <p className="text-zinc-600 text-xs text-center py-4">Aucun dossier</p>
                    ) : (
                      colItems.map((item: any) => (
                        <AvisCard
                          key={item.id}
                          item={item}
                          onEtapeChange={handleEtapeChange}
                          onDelete={handleDelete}
                          onNotesSaved={handleNotesSaved}
                          isAdmin={isAdmin}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
