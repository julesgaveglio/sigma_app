/**
 * AssigneeSelect — Dropdown d'assignation structuré
 *
 * Modes disponibles :
 *   - "team"     : membres internes (Maria, Manon, Élodie, Hanna, Othmane)
 *   - "courtier" : courtiers actifs depuis la BDD + membres internes
 *   - "agent"    : agents immo actifs depuis la BDD + membres internes
 *   - "all"      : team + courtiers + agents
 *
 * Props supplémentaires pour le mode courtier :
 *   - leadVille  : ville du lead → courtiers dont la région correspond remontent en tête avec ✅
 *   - toast quota : alerte automatique si le courtier sélectionné a ≥10 dossiers cette semaine
 */

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/** Vérifie si une région correspond à une ville (matching simplifié) */
function regionMatchesVille(region: string, ville: string): boolean {
  if (!ville) return false;
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-'\s]/g, "");
  const v = normalize(ville);
  const r = normalize(region);
  if (r.includes(v) || v.includes(r)) return true;
  const REGION_MAP: Record<string, string[]> = {
    "iledefrance": ["paris","seine","marne","oise","yvelines","essonne","hautsdeseine","valdemarne","valdoise","versailles","boulogne","vincennes","montreuil","argenteuil","nanterre","creteil","evry","pontoise","goussainville","sarcelles","villepinte","bobigny","aubervilliers","stdennis","saintdenis","courbevoie","levallois","puteaux","issy","clamart","chatenay","massy","palaiseau","corbeil","melun","meaux","pontault","noisy","lagny","torcy","chelles","rosny"],
    "auvergnerhonesalpes": ["lyon","grenoble","clermont","annecy","chambery","valence","saintetienne","bourgenbressa"],
    "provencealpes": ["marseille","nice","toulon","aixenprovence","avignon","antibes","cannes","frejus","draguignan"],
    "nouvelleaquitaine": ["bordeaux","limoges","poitiers","bayonne","pau","larochelle","perigueux"],
    "occitanie": ["toulouse","montpellier","nimes","perpignan","carcassonne","albi","beziers"],
    "hautsdefrance": ["lille","amiens","valenciennes","roubaix","tourcoing","dunkerque","calais"],
    "grandest": ["strasbourg","reims","metz","nancy","mulhouse","colmar","troyes"],
    "bretagne": ["rennes","brest","quimper","lorient","vannes","saintbrieuc"],
    "paysdelaloire": ["nantes","lemans","angers","saintnazaire","larochesuryona"],
    "normandie": ["rouen","caen","lehavre","cherbourg","evreux","alencon"],
    "bourgognefranchecomte": ["dijon","besancon","chalonsursaone","belfort","auxerre"],
    "centrevaldeloire": ["tours","orleans","bourges","blois","chartres"],
  };
  for (const [regionKey, villes] of Object.entries(REGION_MAP)) {
    if (r.includes(regionKey) || regionKey.includes(r)) {
      if (villes.some(cv => v.includes(cv) || cv.includes(v))) return true;
    }
  }
  return false;
}

export interface AssigneeOption {
  value: string;           // Nom affiché (ex: "Manon DUBOST")
  label: string;           // Label pour le select
  email: string;
  userId?: number | null;
  type: "team" | "courtier" | "agent";
}

// Membres internes fixes
const TEAM_MEMBERS: AssigneeOption[] = [
  { value: "Othmane", label: "Othmane (Direction)", email: "othmanehiyadi@sigmaipf.fr", userId: 2, type: "team" },
  { value: "Hanna",   label: "Hanna (Custom Care)", email: "assistance.direction@sigmaipf.fr", userId: 3, type: "team" },
  { value: "Maria",   label: "Maria (Welcome Call)", email: "maria@sigmaipf.fr", userId: 4, type: "team" },
  { value: "Manon",   label: "Manon (Courtage)", email: "manondubost@sigmaipf.fr", userId: 5, type: "team" },
  { value: "Elodie",  label: "Élodie (Immo)", email: "elodie@sigmafactory.fr", userId: 570015, type: "team" },
  { value: "Marie",   label: "Marie (Avis & Témoignages)", email: "mariecabut@sigmaipf.fr", userId: null, type: "team" },
];

interface AssigneeSelectProps {
  mode: "team" | "courtier" | "agent" | "all";
  value: string;
  onChange: (value: string, option: AssigneeOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeTeam?: boolean;
  /** Ville du lead (état civil) — active le matching région pour les courtiers */
  leadVille?: string | null;
}

export function AssigneeSelect({
  mode,
  value,
  onChange,
  placeholder = "— Sélectionner —",
  disabled = false,
  className = "",
  includeTeam = true,
  leadVille,
}: AssigneeSelectProps) {
  // Charger les courtiers si nécessaire
  const { data: courtiersData } = trpc.courtiers.list.useQuery(
    { statut: "actif" },
    { enabled: mode === "courtier" || mode === "all" }
  );

  // Charger les agents immo (ambassadeurs) si nécessaire
  const { data: agentsData } = trpc.ambassadeurs.list.useQuery(
    { statut: "actif" },
    { enabled: mode === "agent" || mode === "all" }
  );

  // Charger quota hebdomadaire (courtiers uniquement)
  const { data: quotaData } = trpc.courtiers.quotaHebdo.useQuery(undefined, {
    enabled: mode === "courtier" || mode === "all",
  });

  // Index quota par nom
  const quotaByNom = new Map<string, { hebdo: number; regions: string[] }>();
  if (quotaData) {
    for (const q of quotaData) {
      quotaByNom.set(q.courtierNom, { hebdo: q.hebdo, regions: q.regions });
    }
  }

  // Construire la liste d'options (pour handleChange)
  const options: AssigneeOption[] = [];
  if (mode === "team" || includeTeam) options.push(...TEAM_MEMBERS);
  if ((mode === "courtier" || mode === "all") && courtiersData) {
    const existingEmails = new Set(options.map(o => o.email));
    courtiersData
      .filter((c: any) => c.statutInterne === "actif" && !existingEmails.has(c.email))
      .forEach((c: any) => options.push({
        value: `${c.prenom} ${c.nom}`.trim(),
        label: `${c.prenom} ${c.nom} — ${c.cabinetNom ?? c.email}`,
        email: c.email, userId: c.userId, type: "courtier" as const,
      }));
  }
  if ((mode === "agent" || mode === "all") && agentsData) {
    const existingEmails = new Set(options.map(o => o.email));
    (agentsData as any[])
      .filter((a: any) => ["agent_immobilier","mandataire"].includes(a.statut) && a.statutInterne === "actif" && !existingEmails.has(a.email))
      .forEach((a: any) => options.push({
        value: `${a.prenom} ${a.nom}`.trim(),
        label: `${a.prenom} ${a.nom} — ${a.email}`,
        email: a.email, userId: a.userId, type: "agent" as const,
      }));
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = options.find(o => o.value === e.target.value) ?? null;
    // Toast quota si courtier ≥ 10 dossiers cette semaine
    if (selected?.type === "courtier" && e.target.value) {
      const quota = quotaByNom.get(e.target.value);
      if (quota && quota.hebdo >= 10) {
        toast.warning(`⚠️ ${e.target.value} a déjà ${quota.hebdo} dossiers cette semaine (seuil : 10). Vous pouvez continuer, mais vérifiez sa disponibilité.`, { duration: 6000 });
      }
    }
    onChange(e.target.value, selected);
  };

  const existingTeamEmails = new Set(TEAM_MEMBERS.map(m => m.email));

  // Enrichir les courtiers avec matching région et quota
  const enrichCourtier = (c: any) => {
    const nom = `${c.prenom} ${c.nom}`.trim();
    const quota = quotaByNom.get(nom);
    const regions: string[] = quota?.regions ?? [];
    const isMatch = leadVille ? regions.some(r => regionMatchesVille(r, leadVille)) : false;
    const quotaStr = quota && quota.hebdo >= 10
      ? ` ⚠️ ${quota.hebdo}/sem`
      : quota && quota.hebdo > 0 ? ` (${quota.hebdo}/sem)` : "";
    const matchStr = isMatch ? "✅ " : "";
    return {
      value: nom,
      label: `${matchStr}${c.prenom} ${c.nom}${c.cabinetNom ? ` — ${c.cabinetNom}` : ""}${quotaStr}`,
      isMatch,
    };
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-amber-500 ${className}`}
    >
      <option value="">{placeholder}</option>

      {/* Groupe Team interne */}
      {(mode === "team" || includeTeam) && (
        <optgroup label="— Équipe interne —">
          {TEAM_MEMBERS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </optgroup>
      )}

      {/* Groupe Courtiers — matching région en tête */}
      {(mode === "courtier" || mode === "all") && courtiersData && (() => {
        const enriched = courtiersData
          .filter((c: any) => c.statutInterne === "actif" && !existingTeamEmails.has(c.email))
          .map(enrichCourtier)
          .sort((a: any, b: any) => (b.isMatch ? 1 : 0) - (a.isMatch ? 1 : 0));

        const matching = enriched.filter((c: any) => c.isMatch);
        const autres = enriched.filter((c: any) => !c.isMatch);

        return (
          <>
            {matching.length > 0 && (
              <optgroup label="— ✅ Région correspondante —">
                {matching.map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            )}
            {autres.length > 0 && (
              <optgroup label={matching.length > 0 ? "— Autres courtiers partenaires —" : "— Courtiers partenaires —"}>
                {autres.map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            )}
          </>
        );
      })()}

      {/* Groupe Agents immo */}
      {(mode === "agent" || mode === "all") && agentsData && (() => {
        const agentOpts = (agentsData as any[])
          .filter((a: any) => ["agent_immobilier","mandataire"].includes(a.statut) && a.statutInterne === "actif" && !existingTeamEmails.has(a.email))
          .map((a: any) => ({
            value: `${a.prenom} ${a.nom}`.trim(),
            label: `${a.prenom} ${a.nom} — ${a.ville ?? a.email}`,
          }));
        return agentOpts.length > 0 ? (
          <optgroup label="— Agents immobiliers —">
            {agentOpts.map((o: any) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ) : null;
      })()}
    </select>
  );
}

// Export des membres de la team pour usage direct
export { TEAM_MEMBERS };

// Helper : résoudre l'email d'un assigné à partir de son nom
export function resolveAssigneeEmail(name: string): string | null {
  const member = TEAM_MEMBERS.find(m => m.value === name || m.label.includes(name));
  return member?.email ?? null;
}

// Helper : résoudre le destinataire de notification à partir du nom
export function resolveNotifDestinataire(name: string): "Maria" | "Manon" | "Elodie" | "Hanna" | "Marie" | "Owner" | null {
  if (name.includes("Maria")) return "Maria";
  if (name.includes("Manon")) return "Manon";
  if (name.includes("Elodie") || name.includes("Élodie")) return "Elodie";
  if (name.includes("Hanna")) return "Hanna";
  if (name.includes("Marie")) return "Marie";
  if (name.includes("Othmane")) return "Owner";
  return null;
}
