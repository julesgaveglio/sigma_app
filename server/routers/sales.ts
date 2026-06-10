import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { closes, Close, crmLeads } from "../../drizzle/schema";
import { desc, gte, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Constantes financières ───────────────────────────────────────────────────
const FRAIS_CB_STRIPE = 0.014;   // 1.4%
const FRAIS_CB_FIXE   = 25;      // 0.25€ en centimes
const FRAIS_VIREMENT  = 0.003;   // 0.3%
const FRAIS_PRELEVEMENT = 0.003; // 0.3%
const TVA = 0.20;

function calcFraisBancaires(cb: number, vir: number, prel: number) {
  return (cb > 0 ? Math.round(cb * FRAIS_CB_STRIPE + FRAIS_CB_FIXE) : 0)
       + Math.round(vir * FRAIS_VIREMENT)
       + Math.round(prel * FRAIS_PRELEVEMENT);
}

function ttcToHt(ttc: number) { return Math.round(ttc / (1 + TVA)); }

function getDateRange(periode: string): Date {
  const now = new Date();
  if (periode === "jour") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (periode === "semaine") {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (periode === "annee") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ─── Graphique CA par période ─────────────────────────────────────────────────
function buildGraphiqueCA(rows: Close[], periode: string) {
  const now = new Date();
  const data: { label: string; key: string; caGenere: number; caEncaisse: number; nbCloses: number }[] = [];

  if (periode === "jour") {
    // 24 heures du jour courant
    for (let h = 0; h < 24; h++) {
      data.push({ label: `${String(h).padStart(2, "0")}h`, key: String(h), caGenere: 0, caEncaisse: 0, nbCloses: 0 });
    }
    for (const r of rows) {
      const d = new Date(r.dateCall);
      const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
      if (d.toDateString() === now.toDateString()) {
        const h = d.getHours();
        if (isCA) { data[h].caGenere += r.montantGenere / 100; data[h].caEncaisse += r.montantEncaisse / 100; }
        if (r.show && r.pitche && r.formule) data[h].nbCloses++;
      }
    }
  } else if (periode === "semaine") {
    // 7 jours de la semaine courante
    const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    for (let i = 0; i < 7; i++) data.push({ label: jours[i], key: String(i), caGenere: 0, caEncaisse: 0, nbCloses: 0 });
    const startOfWeek = getDateRange("semaine");
    for (const r of rows) {
      const d = new Date(r.dateCall);
      const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
      const dayIdx = Math.floor((d.getTime() - startOfWeek.getTime()) / (86400000));
      if (dayIdx >= 0 && dayIdx < 7) {
        if (isCA) { data[dayIdx].caGenere += r.montantGenere / 100; data[dayIdx].caEncaisse += r.montantEncaisse / 100; }
        if (r.show && r.pitche && r.formule) data[dayIdx].nbCloses++;
      }
    }
  } else if (periode === "mois") {
    // Semaines du mois courant (S1 à S5)
    for (let w = 1; w <= 5; w++) data.push({ label: `S${w}`, key: String(w), caGenere: 0, caEncaisse: 0, nbCloses: 0 });
    const startOfMonth = getDateRange("mois");
    for (const r of rows) {
      const d = new Date(r.dateCall);
      const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
      const weekIdx = Math.floor((d.getDate() - 1) / 7);
      if (weekIdx >= 0 && weekIdx < 5) {
        if (isCA) { data[weekIdx].caGenere += r.montantGenere / 100; data[weekIdx].caEncaisse += r.montantEncaisse / 100; }
        if (r.show && r.pitche && r.formule) data[weekIdx].nbCloses++;
      }
    }
  } else if (periode === "annee") {
    // 12 mois de l'année
    const moisLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    for (let m = 0; m < 12; m++) data.push({ label: moisLabels[m], key: String(m), caGenere: 0, caEncaisse: 0, nbCloses: 0 });
    for (const r of rows) {
      const d = new Date(r.dateCall);
      const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
      if (d.getFullYear() === now.getFullYear()) {
        const m = d.getMonth();
        if (isCA) { data[m].caGenere += r.montantGenere / 100; data[m].caEncaisse += r.montantEncaisse / 100; }
        if (r.show && r.pitche && r.formule) data[m].nbCloses++;
      }
    }
  }

  return data.map(d => ({
    ...d,
    caGenere: Math.round(d.caGenere * 100) / 100,
    caEncaisse: Math.round(d.caEncaisse * 100) / 100,
  }));
}

// ─── Calcul prévisionnel ─────────────────────────────────────────────────────
// Pour chaque close avec montant restant, on projette les échéances futures
// basées sur le mode de paiement et la date de prélèvement si disponible.
function buildPrevisionnel(allRows: Close[]) {
  const now = new Date();
  // On travaille sur 6 mois glissants (passé + futur)
  const months: { label: string; key: string; attendu: number; encaisse: number }[] = [];
  for (let i = -2; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    months.push({ key, label, attendu: 0, encaisse: 0 });
  }

  for (const r of allRows) {
    // CA uniquement sur les calls "closé" pour éviter les doublons R1+Close
    const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
    if (!isCA) continue;
    const genere = r.montantGenere / 100;
    const encaisse = r.montantEncaisse / 100;
    const reste = genere - encaisse;
    if (reste <= 0) continue;

    const callDate = new Date(r.dateCall);
    const callKey = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, "0")}`;

    // Répartition selon le mode de paiement
    const nbEcheances = r.modePaiement === "trois_fois" ? 3 : r.modePaiement === "deux_fois" ? 2 : 1;
    const montantParEcheance = reste / nbEcheances;

    for (let i = 0; i < nbEcheances; i++) {
      let echeanceDate: Date;
      if (r.datePrelevement && i === 0) {
        // Première échéance = date de prélèvement saisie
        const parts = r.datePrelevement.split("-");
        if (parts.length === 3) {
          echeanceDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          echeanceDate = new Date(callDate.getFullYear(), callDate.getMonth() + i + 1, 1);
        }
      } else {
        // Échéances suivantes : +1 mois par tranche
        echeanceDate = new Date(callDate.getFullYear(), callDate.getMonth() + i + 1, 1);
      }

      const echeanceKey = `${echeanceDate.getFullYear()}-${String(echeanceDate.getMonth() + 1).padStart(2, "0")}`;
      const monthEntry = months.find(m => m.key === echeanceKey);
      if (monthEntry) {
        if (echeanceDate <= now) {
          monthEntry.encaisse += montantParEcheance;
        } else {
          monthEntry.attendu += montantParEcheance;
        }
      }
    }

    // Mois du call : encaissement immédiat (CB/virement)
    const immediat = (r.montantCb || 0) / 100 + (r.montantVirement || 0) / 100;
    if (immediat > 0) {
      const callMonthEntry = months.find(m => m.key === callKey);
      if (callMonthEntry) callMonthEntry.encaisse += immediat;
    }
  }

  return months.map(m => ({
    ...m,
    attendu: Math.round(m.attendu * 100) / 100,
    encaisse: Math.round(m.encaisse * 100) / 100,
  }));
}

export const salesRouter = router({
  // ─── PUBLIC : soumettre un close ─────────────────────────────────────────
  soumettre: publicProcedure
    .input(z.object({
      closerNom: z.string().min(2),
      leadNom: z.string().optional().default(""),
      leadEmail: z.string().email().optional().or(z.literal("")),
      leadTelephone: z.string().optional(),
      offre: z.enum(["IDRH", "HZC", "SDT"]),
      show: z.boolean(),
      pitche: z.boolean().default(false),
      resultat: z.enum(["close", "non_close", "r2", "perdu"]).optional(),
      lienFathom: z.string().url().optional().or(z.literal("")),
      formule: z.enum(["Starter", "Premium"]).optional(),
      modePaiement: z.enum(["une_fois", "deux_fois", "trois_fois"]).optional(),
      montantGenere: z.number().min(0).default(0),
      montantEncaisse: z.number().min(0).default(0),
      montantCb: z.number().min(0).optional(),
      montantVirement: z.number().min(0).optional(),
      montantCreditImpot: z.number().min(0).optional(),
      montantPrelevement: z.number().min(0).optional(),
      datePrelevement: z.string().optional(),
      commentaire: z.string().optional(),
      dateCall: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const dateCall = input.dateCall ? new Date(input.dateCall) : new Date();
      const toC = (v?: number) => v ? Math.round(v * 100) : undefined;
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");

      // ─── Regroupement par email : trouver un leadId existant ─────────────
      // Si un call précédent existe avec le même email, on réutilise son leadId
      // (ou son id comme leadId pivot) pour relier R1→R2→Closé sans doublon CA
      let leadId: number | undefined = undefined;
      if (input.leadEmail) {
        const [existing] = await db
          .select({ id: closes.id, leadId: closes.leadId })
          .from(closes)
          .where(sql`${closes.leadEmail} = ${input.leadEmail}`)
          .orderBy(closes.createdAt)
          .limit(1);
        if (existing) {
          // Le leadId pivot est le leadId du premier call (ou son id si c'était le premier)
          leadId = existing.leadId ?? existing.id;
        }
      }

      const [result] = await db.insert(closes).values({
        leadId: leadId ?? undefined,
        closerNom: input.closerNom,
        leadNom: input.leadNom,
        leadEmail: input.leadEmail || undefined,
        leadTelephone: input.leadTelephone || undefined,
        offre: input.offre,
        show: input.show,
        pitche: input.pitche,
        resultat: input.resultat,
        lienFathom: input.lienFathom || undefined,
        formule: input.formule,
        modePaiement: input.modePaiement,
        montantGenere: Math.round(input.montantGenere * 100),
        montantEncaisse: Math.round(input.montantEncaisse * 100),
        montantCb: toC(input.montantCb),
        montantVirement: toC(input.montantVirement),
        montantCreditImpot: toC(input.montantCreditImpot),
        montantPrelevement: toC(input.montantPrelevement),
        datePrelevement: input.datePrelevement || undefined,
        commentaire: input.commentaire || undefined,
        dateCall,
      });
      const statut = !input.show ? "NO SHOW"
        : input.resultat === "close" ? `CLOSÉ — ${input.formule || "?"} — ${input.montantGenere}€`
        : input.resultat === "r2" ? "SHOW — R2"
        : input.resultat === "perdu" ? "SHOW — Perdu"
        : input.pitche ? `SHOW — Pitché — ${input.formule || "?"}`
        : "SHOW — Non pitché";
      await notifyOwner({
        title: `[Sales] ${input.closerNom} — ${input.offre} — ${statut}`,
        content: `Lead : ${input.leadNom} (${input.leadEmail || "—"})\nOffre : ${input.offre} | ${statut}\nMontant généré : ${input.montantGenere}€ | Encaissé : ${input.montantEncaisse}€\n${input.commentaire ? "Commentaire : " + input.commentaire : ""}`,
      });

      // ─── Création automatique fiche CRM si close ─────────────────────────
      // Uniquement si le call est closé (résultat = close)
      if (input.resultat === "close" && input.leadEmail) {
        // Déduplication : vérifier si une fiche CRM existe déjà pour cet email
        const [existingCrm] = await db
          .select({ id: crmLeads.id })
          .from(crmLeads)
          .where(sql`${crmLeads.email} = ${input.leadEmail}`)
          .limit(1);

        if (!existingCrm) {
          // Routage : crédit d'impôt → sigma_credit, sinon → sigma_cash
          const aCreditImpot = (input.montantCreditImpot || 0) > 0;
          const etapeCrm = aCreditImpot ? "sigma_credit" : "sigma_cash";

          // Décomposer le nom complet (leadNom peut contenir prénom + nom)
          const nomParts = (input.leadNom || "").trim().split(" ");
          const prenom = nomParts[0] || "—";
          const nom = nomParts.slice(1).join(" ") || prenom;

          await db.insert(crmLeads).values({
            nom,
            prenom,
            email: input.leadEmail,
            telephone: input.leadTelephone || "",
            etape: etapeCrm,
            statut: "actif",
            notes: `Closé par ${input.closerNom} le ${new Date().toLocaleDateString("fr-FR")} — ${input.offre} ${input.formule || ""} — ${input.montantGenere}€ TTC${aCreditImpot ? " (dont crédit d'impôt : " + (input.montantCreditImpot || 0) + "€)" : ""}`,
          });
        }
      }

      return { success: true, id: (result as any).insertId, leadId: leadId ?? (result as any).insertId };
    }),

  // ─── PROTÉGÉ : liste des closes ──────────────────────────────────────────
  liste: protectedProcedure
    .input(z.object({
      periode: z.enum(["jour", "semaine", "mois", "tout"]).default("mois"),
      closerNom: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.periode !== "tout") conditions.push(gte(closes.dateCall, getDateRange(input.periode)));
      if (input.closerNom) conditions.push(sql`${closes.closerNom} = ${input.closerNom}`);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(closes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(closes.dateCall));
      return rows.map((r: Close) => ({
        ...r,
        montantGenere: r.montantGenere / 100,
        montantEncaisse: r.montantEncaisse / 100,
        montantCb: r.montantCb ? r.montantCb / 100 : null,
        montantVirement: r.montantVirement ? r.montantVirement / 100 : null,
        montantCreditImpot: r.montantCreditImpot ? r.montantCreditImpot / 100 : null,
        montantPrelevement: r.montantPrelevement ? r.montantPrelevement / 100 : null,
      }));
    }),

  // ─── PROTÉGÉ : stats dashboard ───────────────────────────────────────────
  stats: protectedProcedure
    .input(z.object({ periode: z.enum(["jour", "semaine", "mois"]).default("mois") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");

      // Rows de la période sélectionnée
      const rows = await db.select().from(closes)
        .where(gte(closes.dateCall, getDateRange(input.periode)))
        .orderBy(desc(closes.dateCall));

      // Tous les rows (pour le prévisionnel global)
      const allRows = await db.select().from(closes).orderBy(desc(closes.dateCall));

      // ── Stats globales ──
      // Un "call" = un lead unique (R1+R2+R3 avec le même email/tel = 1 seul call)
      // On déduplique par leadEmail (ou leadTelephone si email vide)
      const getLeadKey = (r: Close) => (r.leadEmail?.trim().toLowerCase() || r.leadTelephone?.trim() || `id-${r.id}`);
      // Pour chaque lead unique, on garde la ligne la plus "avancée" (close > autres > r2 no-show)
      // close=4, non_close/perdu=3, r2 avec show=2, null/r2 sans show=1
      const leadResultatPriority = (res: string | null, show: boolean) =>
        res === 'close' ? 4 : res === 'non_close' || res === 'perdu' ? 3 : (show ? 2 : 1);
      const leadsUniquesMap = new Map<string, Close>();
      for (const r of rows as Close[]) {
        const key = getLeadKey(r);
        const existing = leadsUniquesMap.get(key);
        if (!existing || leadResultatPriority(r.resultat, r.show) > leadResultatPriority(existing.resultat, existing.show)) {
          leadsUniquesMap.set(key, r);
        }
      }
      const rowsInitiaux = Array.from(leadsUniquesMap.values());
      const totalCalls = rowsInitiaux.length;
      const shows = rowsInitiaux.filter((r: Close) => r.show);
      const noShows = rowsInitiaux.filter((r: Close) => !r.show);
      const closes_ = rowsInitiaux.filter((r: Close) => r.show && r.pitche && r.formule);

      // Déduplication CA : on ne compte le CA que sur les calls "closé" (résultat=close)
      // Pour éviter de compter 2x le même lead (R1 + Close), on filtre par résultat=close
      // Les calls R2/Non closé/Perdu ne génèrent pas de CA
      const rowsCA = rows.filter((r: Close) => r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule));

      const caGenere    = rowsCA.reduce((s: number, r: Close) => s + r.montantGenere, 0) / 100;
      const caEncaisse  = rowsCA.reduce((s: number, r: Close) => s + r.montantEncaisse, 0) / 100;
      const resteAEncaisser = caGenere - caEncaisse;
      const caHt        = ttcToHt(caGenere * 100) / 100;
      const caEncaisseHt = ttcToHt(caEncaisse * 100) / 100;
      const resteHt     = ttcToHt(resteAEncaisser * 100) / 100;

      const totalCb     = rows.reduce((s: number, r: Close) => s + (r.montantCb || 0), 0) / 100;
      const totalVirement = rows.reduce((s: number, r: Close) => s + (r.montantVirement || 0), 0) / 100;
      const totalPrelevement = rows.reduce((s: number, r: Close) => s + (r.montantPrelevement || 0), 0) / 100;
      const totalCreditImpot = rows.reduce((s: number, r: Close) => s + (r.montantCreditImpot || 0), 0) / 100;
      const fraisBancaires = calcFraisBancaires(
        Math.round(totalCb * 100), Math.round(totalVirement * 100), Math.round(totalPrelevement * 100)
      ) / 100;

      const tauxClosing = shows.length > 0 ? (closes_.length / shows.length) * 100 : 0;
      const tauxNoShow  = totalCalls > 0 ? (noShows.length / totalCalls) * 100 : 0;
      const caMoyen     = closes_.length > 0 ? caGenere / closes_.length : 0;
      const caMoyenParCall = totalCalls > 0 ? caGenere / totalCalls : 0;

      // ── Stats par closer ──
      // Dédupliquer par closer + lead unique (leadEmail ou leadTelephone)
      // Pour chaque closer, on garde la ligne la plus avancée par lead
      const closerLeadMap = new Map<string, Map<string, Close>>();
      for (const r of rows as Close[]) {
        if (!closerLeadMap.has(r.closerNom)) closerLeadMap.set(r.closerNom, new Map());
        const leadMap = closerLeadMap.get(r.closerNom)!;
        const key = getLeadKey(r);
        const existing = leadMap.get(key);
        if (!existing || leadResultatPriority(r.resultat, r.show) > leadResultatPriority(existing.resultat, existing.show)) {
          leadMap.set(key, r);
        }
      }
      const closerMap = new Map<string, {
        nom: string; calls: number; shows: number; noShows: number;
        closes: number; caGenere: number; caEncaisse: number; resteAEncaisser: number;
      }>();
      for (const [closerNom, leadMap] of Array.from(closerLeadMap.entries())) {
        const stats = { nom: closerNom, calls: 0, shows: 0, noShows: 0, closes: 0, caGenere: 0, caEncaisse: 0, resteAEncaisser: 0 };
        for (const r of Array.from(leadMap.values())) {
          stats.calls++;
          if (r.show) { stats.shows++; if (r.pitche && r.formule) stats.closes++; } else stats.noShows++;
          // CA uniquement sur les lignes closées
          const isCA = r.resultat === "close" || (!r.resultat && r.show && r.pitche && r.formule);
          if (isCA) {
            stats.caGenere += (r.montantGenere as number) / 100;
            stats.caEncaisse += (r.montantEncaisse as number) / 100;
          }
        }
        stats.resteAEncaisser = stats.caGenere - stats.caEncaisse;
        closerMap.set(closerNom, stats);
      }
      const parCloser = Array.from(closerMap.values()).map(c => ({
        ...c,
        tauxClosing: c.shows > 0 ? (c.closes / c.shows) * 100 : 0,
        tauxNoShow: c.calls > 0 ? (c.noShows / c.calls) * 100 : 0,
        caMoyen: c.closes > 0 ? c.caGenere / c.closes : 0,
        caHt: ttcToHt(Math.round(c.caGenere * 100)) / 100,
        caEncaisseHt: ttcToHt(Math.round(c.caEncaisse * 100)) / 100,
        resteHt: ttcToHt(Math.round(c.resteAEncaisser * 100)) / 100,
      }));

      // ── Prévisionnel d'encaissement (6 mois glissants) ──
      const previsionnel = buildPrevisionnel(allRows as Close[]);

      // ── Prochaines échéances (30 jours) ──
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const prochainesEcheances: { leadNom: string; closerNom: string; date: string; montant: number; offre: string }[] = [];
      for (const r of allRows as Close[]) {
        if (!r.show || !r.pitche || !r.formule) continue;
        const reste = (r.montantGenere - r.montantEncaisse) / 100;
        if (reste <= 0) continue;
        if (r.datePrelevement) {
          const parts = r.datePrelevement.split("-");
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (d >= now && d <= in30) {
              prochainesEcheances.push({ leadNom: r.leadNom, closerNom: r.closerNom, date: r.datePrelevement, montant: reste, offre: r.offre });
            }
          }
        }
      }
      prochainesEcheances.sort((a, b) => a.date.localeCompare(b.date));

      return {
        global: {
          totalCalls, shows: shows.length, noShows: noShows.length, closes: closes_.length,
          caGenere, caEncaisse, resteAEncaisser, caHt, caEncaisseHt, resteHt,
          fraisBancaires, tauxClosing, tauxNoShow, caMoyen, caMoyenParCall,
          totalCb, totalVirement, totalPrelevement, totalCreditImpot,
        },
        parCloser,
        moyenneClosingGlobal: tauxClosing,
        previsionnel,
        prochainesEcheances,
        recentCloses: rows.slice(0, 30).map((r: Close) => ({
          ...r,
          montantGenere: r.montantGenere / 100,
          montantEncaisse: r.montantEncaisse / 100,
          montantCb: r.montantCb ? r.montantCb / 100 : null,
          montantVirement: r.montantVirement ? r.montantVirement / 100 : null,
          montantCreditImpot: r.montantCreditImpot ? r.montantCreditImpot / 100 : null,
          montantPrelevement: r.montantPrelevement ? r.montantPrelevement / 100 : null,
        })),
      };
    }),

  // ─── PROTÉGÉ : export CSV ────────────────────────────────────────────────
  exportCsv: protectedProcedure
    .input(z.object({
      periode: z.enum(["jour", "semaine", "mois", "annee", "tout"]).default("mois"),
      closerNom: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.periode !== "tout") conditions.push(gte(closes.dateCall, getDateRange(input.periode)));
      if (input.closerNom) conditions.push(sql`${closes.closerNom} = ${input.closerNom}`);
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      const rows = await db.select().from(closes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(closes.dateCall));

      const header = ["Date", "Closer", "Lead", "Email", "Téléphone", "Offre", "Show", "Pitché", "Formule", "Mode paiement",
        "CA généré TTC", "CA encaissé TTC", "Reste à encaisser TTC",
        "CA généré HT", "CA encaissé HT",
        "CB", "Virement", "Crédit impôt", "Prélèvement", "Date prélèvement",
        "Frais bancaires", "Commentaire"];

      const csvRows = rows.map((r: Close) => {
        const gen = r.montantGenere / 100;
        const enc = r.montantEncaisse / 100;
        const reste = gen - enc;
        const cb = (r.montantCb || 0) / 100;
        const vir = (r.montantVirement || 0) / 100;
        const prel = (r.montantPrelevement || 0) / 100;
        const frais = calcFraisBancaires(r.montantCb || 0, r.montantVirement || 0, r.montantPrelevement || 0) / 100;
        return [
          new Date(r.dateCall).toLocaleDateString("fr-FR"),
          r.closerNom,
          r.leadNom,
          r.leadEmail || "",
          r.leadTelephone || "",
          r.offre,
          r.show ? "Show" : "No Show",
          r.pitche ? "Oui" : "Non",
          r.formule || "",
          r.modePaiement?.replace("_", " ") || "",
          gen.toFixed(2),
          enc.toFixed(2),
          reste.toFixed(2),
          ttcToHt(Math.round(gen * 100)) / 100,
          ttcToHt(Math.round(enc * 100)) / 100,
          cb.toFixed(2),
          vir.toFixed(2),
          ((r.montantCreditImpot || 0) / 100).toFixed(2),
          prel.toFixed(2),
          r.datePrelevement || "",
          frais.toFixed(2),
          (r.commentaire || "").replace(/,/g, ";").replace(/\n/g, " "),
        ].join(",");
      });

      return [header.join(","), ...csvRows].join("\n");
    }),

  // ─── PROTÉGÉ : graphique CA ────────────────────────────────────────────────
  graphiqueCA: protectedProcedure
    .input(z.object({ periode: z.enum(["jour", "semaine", "mois", "annee"]).default("mois") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Pour l'année, on prend tous les rows de l'année en cours
      const dateFrom = getDateRange(input.periode === "annee" ? "annee" : input.periode);
      const rows = await db.select().from(closes).where(gte(closes.dateCall, dateFrom)).orderBy(desc(closes.dateCall));
      return buildGraphiqueCA(rows as Close[], input.periode);
    }),

  // ─── PROTÉGÉ : closers uniques ───────────────────────────────────────────
  // Liste fixe — à mettre à jour lors du changement d'équipe en mai
  listeClosers: protectedProcedure.query(async () => {
    return ["Marie", "Laurent"];
  }),

  // ─── PROTÉGÉ : données encaissement d'un lead par email (pour pipeline CRM) ──
  getCloseByEmail: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      // Chercher le close le plus récent pour cet email avec résultat = close
      const [row] = await db
        .select()
        .from(closes)
        .where(and(sql`${closes.leadEmail} = ${input.email}`, sql`${closes.resultat} = 'close'`))
        .orderBy(desc(closes.dateCall))
        .limit(1);
      if (!row) return null;
      const c = row as Close;
      const montantGenere = (c.montantGenere || 0) / 100;
      const montantEncaisse = (c.montantEncaisse || 0) / 100;
      const montantCreditImpot = (c.montantCreditImpot || 0) / 100;
      return {
        id: c.id,
        closerNom: c.closerNom,
        offre: c.offre,
        formule: c.formule,
        montantGenere,
        montantEncaisse,
        montantCreditImpot,
        resteAPayer: Math.max(0, montantGenere - montantEncaisse),
        modePaiement: c.modePaiement,
        montantCb: (c.montantCb || 0) / 100,
        montantVirement: (c.montantVirement || 0) / 100,
        montantPrelevement: (c.montantPrelevement || 0) / 100,
        datePrelevement: c.datePrelevement,
        dateVirementPrevu: c.dateVirementPrevu,
        statutEncaissement: c.statutEncaissement,
        dateCall: c.dateCall,
      };
    }),

  // ─── PROTÉGÉ : mettre à jour le statut encaissement d'un close ───────────
  updateStatutEncaissement: protectedProcedure
    .input(z.object({
      closeId: z.number(),
      statutEncaissement: z.enum(["en_attente", "initie", "recu"]),
      dateVirementPrevu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      const updates: Record<string, unknown> = { statutEncaissement: input.statutEncaissement };
      if (input.dateVirementPrevu !== undefined) updates.dateVirementPrevu = input.dateVirementPrevu;
      await db.update(closes).set(updates as any).where(sql`${closes.id} = ${input.closeId}`);
      return { success: true };
    }),

  // ─── PROTÉGÉ : supprimer un close ────────────────────────────────────────
  supprimer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      await db.delete(closes).where(sql`${closes.id} = ${input.id}`);
      return { success: true };
    }),
});
