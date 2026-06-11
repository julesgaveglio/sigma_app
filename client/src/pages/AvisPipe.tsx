/**
 * AvisPipe — Tableau de bord Marie
 * Pipe Avis & Temoignages (4 etapes : Avis a faire / Avis effectue / En montage / Montage OK)
 * Fonctionnalites : notes libres inline, filtres par source (Courtage / Immo / Tous)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import {
  CheckCircle2, Clock, Star, Layers, ChevronRight,
  RefreshCw, Trash2, Phone, Mail, Pencil, Check, X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// --- Etapes du pipe ---

const ETAPES = [
  {
    id: "avis_a_faire" as const,
    label: "Avis a faire",
    icon: Clock,
    color: "var(--gold)",
  },
  {
    id: "avis_effectue" as const,
    label: "Avis effectue",
    icon: CheckCircle2,
    color: "var(--success)",
  },
  {
    id: "en_montage" as const,
    label: "En montage",
    icon: Layers,
    color: "var(--foreground)",
  },
  {
    id: "montage_ok" as const,
    label: "Montage OK",
    icon: Star,
    color: "var(--foreground-muted)",
  },
] as const;

type EtapeId = typeof ETAPES[number]["id"];
type SourceFilter = "tous" | "courtage" | "immo";

// --- Composant carte ---

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

  const etapeIdx = ETAPES.findIndex(e => e.id === item.etape);
  const etapeSuivante = ETAPES[etapeIdx + 1];
  const sourceLabel = item.etapeSource === "courtage" ? "Courtage" : "Immo";

  const handleSaveNotes = () => {
    onNotesSaved(item.id, notesValue);
    setEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesValue(item.notes ?? "");
    setEditingNotes(false);
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "2px",
      padding: "16px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    }}>
      {/* En-tete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
          }}>{item.leadNom}</p>
          <span style={{
            display: "inline-block",
            marginTop: "4px",
            padding: "2px 6px",
            borderRadius: "2px",
            fontSize: "10px",
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: item.etapeSource === "courtage" ? "var(--foreground-muted)" : "var(--success)",
            background: item.etapeSource === "courtage" ? "rgba(107,101,96,0.08)" : "rgba(74,122,90,0.08)",
            border: `1px solid ${item.etapeSource === "courtage" ? "rgba(107,101,96,0.2)" : "rgba(74,122,90,0.2)"}`,
          }}>
            {sourceLabel}
          </span>
        </div>
      </div>

      {/* Coordonnees */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
        {item.leadEmail && (
          <a href={`mailto:${item.leadEmail}`}
            className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70"
            style={{ color: "var(--foreground-faint)", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: "none" }}
          >
            <Mail className="w-3 h-3 shrink-0" style={{ strokeWidth: 1.5 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.leadEmail}</span>
          </a>
        )}
        {item.leadTelephone && (
          <a href={`tel:${item.leadTelephone}`}
            className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70"
            style={{ color: "var(--foreground-faint)", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: "none" }}
          >
            <Phone className="w-3 h-3 shrink-0" style={{ strokeWidth: 1.5 }} />
            <span>{item.leadTelephone}</span>
          </a>
        )}
      </div>

      {/* Notes libres */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
        {editingNotes ? (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Notes internes..."
              rows={3}
              className="focus:outline-none"
              style={{
                width: "100%",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "8px 10px",
                fontSize: "12px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
                resize: "none",
                transition: "border-color 300ms ease",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-80"
                style={{
                  padding: "4px 10px",
                  borderRadius: "2px",
                  fontSize: "10px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  background: "var(--gold)",
                  color: "var(--background)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Check className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Enregistrer
              </button>
              <button
                onClick={handleCancelNotes}
                className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-70"
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: "var(--foreground-faint)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Annuler
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
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", lineHeight: "1.6", flex: 1 }}>{notesValue}</p>
                <Pencil className="w-3 h-3 shrink-0 mt-0.5 transition-opacity duration-300 opacity-0 group-hover:opacity-100" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70">
                <Pencil className="w-3 h-3" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
                <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", fontStyle: "italic" }}>Ajouter une note...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" style={{ borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
        {etapeSuivante && (
          <button
            onClick={() => onEtapeChange(item.id, etapeSuivante.id)}
            className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-80"
            style={{
              fontSize: "10px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "var(--gold)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            {etapeSuivante.label}
          </button>
        )}
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={() => onDelete(item.id)}
            className="transition-colors duration-300"
            style={{ color: "var(--foreground-faint)", background: "none", border: "none", cursor: "pointer", padding: "2px" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--destructive)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--foreground-faint)")}
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
          </button>
        )}
      </div>

      {/* Date */}
      <p className="tabular-nums" style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
        Ajoute le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// --- Page principale ---

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
      toast.success("Note enregistree !");
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
    if (confirm("Supprimer cette entree du pipe avis ?")) {
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

  const SOURCE_FILTERS: { id: SourceFilter; label: string; count: number }[] = [
    { id: "tous", label: "Tous", count: (items as any[]).length },
    { id: "courtage", label: "Courtage", count: countCourtage },
    { id: "immo", label: "Immo", count: countImmo },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* En-tete */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
            }}>
              Pipe Avis & Temoignages
            </h1>
            <p style={{
              fontSize: "12px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "var(--foreground-muted)",
              marginTop: "4px",
            }}>
              {filteredItems.length} dossier{filteredItems.length !== 1 ? "s" : ""}
              {sourceFilter !== "tous" && ` — ${sourceFilter === "courtage" ? "Courtage" : "Immo"}`}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 transition-colors duration-300"
            style={{
              padding: "8px 12px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "var(--foreground-faint)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-faint)"; }}
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            Actualiser
          </button>
        </div>

        {/* Filtres par source */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setSourceFilter(f.id)}
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "6px 14px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: `1px solid ${sourceFilter === f.id ? "var(--gold)" : "var(--border)"}`,
                background: sourceFilter === f.id ? "rgba(201,168,76,0.06)" : "transparent",
                color: sourceFilter === f.id ? "var(--gold)" : "var(--foreground-faint)",
                cursor: "pointer",
              }}
            >
              {f.label}
              <span className="tabular-nums" style={{
                fontSize: "10px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                padding: "0 4px",
                color: sourceFilter === f.id ? "var(--gold)" : "var(--foreground-faint)",
                opacity: 0.7,
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <Star className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
              {sourceFilter === "tous"
                ? "Aucun dossier dans le pipe"
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
                <div key={etape.id} style={{
                  background: "var(--surface-header)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  padding: "16px",
                }}>
                  {/* En-tete colonne */}
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-4 h-4" style={{ color: etape.color, strokeWidth: 1.5 }} />
                    <span className="label-uppercase" style={{ color: etape.color }}>{etape.label}</span>
                    <span className="ml-auto tabular-nums" style={{
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      color: "var(--foreground-faint)",
                    }}>{colItems.length}</span>
                  </div>

                  {/* Cartes */}
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    {colItems.length === 0 ? (
                      <p style={{
                        fontSize: "11px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        color: "var(--foreground-faint)",
                        textAlign: "center" as const,
                        padding: "16px 0",
                      }}>Aucun dossier</p>
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
