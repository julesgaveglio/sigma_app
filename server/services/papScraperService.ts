import axios from "axios";
import * as cheerio from "cheerio";
import { getDb } from "../db";
import { biens } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export interface PAPBien {
  id: string;
  titre: string;
  prix: number;
  adresse: string;
  codePostal: string;
  ville: string;
  surface: number;
  nbPieces?: number;
  typeBien: "appartement" | "maison" | "villa" | "terrain" | "local_commercial" | "autre";
  description: string;
  photos: string[];
  url: string;
  datePublication: Date;
}

/**
 * Scrape les biens d'investissement depuis des sources publiques
 * Utilise une approche avec données de test pour éviter les blocages
 */
export async function scrapePAPBiens(): Promise<PAPBien[]> {
  const annonces: PAPBien[] = [];
  
  try {
    console.log("[PAP Scraper] Démarrage du scraping PAP...");
    
    // URLs de recherche PAP pour biens d'investissement
    const searchUrls = [
      "https://www.pap.fr/annonce/vente-immeuble-rapport",
      "https://www.pap.fr/annonce/vente-maison?surface_min=80&prix_max=500000",
      "https://www.pap.fr/annonce/vente-appartement?surface_min=60&prix_max=500000&nb_pieces_min=3",
    ];

    // Scraper chaque URL
    for (const url of searchUrls) {
      try {
        console.log(`[PAP Scraper] Tentative scraping: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Referer": "https://www.pap.fr",
          },
          timeout: 10000,
        });

        console.log(`[PAP Scraper] Réponse reçue (${response.data.length} bytes)`);
        
        // Parser le HTML avec cheerio
        const $ = cheerio.load(response.data);
        
        // Extraire les annonces (sélecteurs PAP)
        $(".annonce-item, .listing-item, [data-annonce-id]").each((i, elem) => {
          try {
            const titre = $(elem).find(".annonce-title, h2, .title").text().trim();
            const prixText = $(elem).find(".annonce-price, .price, [data-price]").text().trim();
            const prix = parseInt(prixText.replace(/[^0-9]/g, "")) || 0;
            const adresse = $(elem).find(".annonce-location, .location, .address").text().trim();
            const surface = parseInt($(elem).find(".annonce-surface, [data-surface]").text().replace(/[^0-9]/g, "")) || 0;
            const description = $(elem).find(".annonce-description, .description").text().trim();
            
            // Filtrer les annonces valides
            if (titre && prix > 60000 && prix < 500000 && surface > 0) {
              const bien: PAPBien = {
                id: `pap_${Date.now()}_${i}`,
                titre,
                prix,
                adresse: adresse || "Adresse non spécifiée",
                codePostal: adresse.match(/\d{5}/)?.[0] || "",
                ville: adresse.split(",").pop()?.trim() || "",
                surface,
                typeBien: detectTypeBien(titre),
                description,
                photos: [],
                url,
                datePublication: new Date(),
              };
              
              annonces.push(bien);
            }
          } catch (e) {
            // Ignorer les erreurs de parsing pour cette annonce
          }
        });
        
        console.log(`[PAP Scraper] ${annonces.length} annonces extraites`);
      } catch (error: any) {
        if (error.response?.status === 403) {
          console.warn(`[PAP Scraper] Accès refusé (403)`);
        } else if (error.code === "ECONNREFUSED") {
          console.warn(`[PAP Scraper] Connexion refusée`);
        } else {
          console.error(`[PAP Scraper] Erreur:`, error.message);
        }
      }
    }

    console.log(`[PAP Scraper] Scraping complété (${annonces.length} annonces)`);
    return annonces;
  } catch (error) {
    console.error("[PAP Scraper] Erreur scraping:", error);
    return [];
  }
}

/**
 * Crée les biens scrappés en base de données
 */
export async function createScrapedBiens(
  annonces: PAPBien[]
): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let created = 0;
  let skipped = 0;

  for (const annonce of annonces) {
    try {
      console.log(`[CreateBien] Création du bien: ${annonce.titre}`);
      // Créer le bien
      await db.insert(biens).values({
        ambassadeurId: null,
        source: "pap_scrape",
        titre: annonce.titre,
        typeBien: annonce.typeBien,
        transaction: "vente",
        usage: isInvestmentProperty(annonce) ? "investissement_locatif" : "residence_principale",
        adresse: annonce.adresse,
        codePostal: annonce.codePostal,
        ville: annonce.ville,
        surface: annonce.surface || 0,
        nbPieces: annonce.nbPieces || null,
        prix: annonce.prix,
        description: annonce.description,
        photoPrincipaleUrl: annonce.photos[0] || null,
        photosUrls: annonce.photos.length > 0 ? JSON.stringify(annonce.photos) : null,
        urlSource: annonce.url,
        statutBien: "en_attente_validation",
        valideParAdmin: false,
        etatBien: "bon_etat",
      });

      created++;
      console.log(`[CreateBien] Bien créé avec succès`);
    } catch (error) {
      console.error("Erreur création bien:", error);
      skipped++;
    }
  }

  return { created, skipped };
}

/**
 * Marque les biens scrappés disparus comme vendus
 */
export async function markMissingBiensAsSold(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    // Récupérer tous les biens scrappés de plus de 30 jours
    const scrapedBiens = await db.select().from(biens).where(
      and(
        eq(biens.source, "pap_scrape"),
        inArray(biens.statutBien, ["en_attente_validation", "publie"])
      )
    );

    let marked = 0;

    for (const bien of scrapedBiens) {
      const createdDate = new Date(bien.createdAt);
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCreation > 30) {
        await db.update(biens).set({ statutBien: "vendu" }).where(eq(biens.id, bien.id));

        marked++;
      }
    }

    return marked;
  } catch (error) {
    console.error("Erreur mark missing:", error);
    return 0;
  }
}

/**
 * Détecte le type de bien
 */
function detectTypeBien(titre: string): PAPBien["typeBien"] {
  const lower = titre.toLowerCase();
  if (lower.includes("appartement") || lower.includes("appart")) return "appartement";
  if (lower.includes("maison")) return "maison";
  if (lower.includes("villa")) return "villa";
  if (lower.includes("terrain")) return "terrain";
  if (lower.includes("commercial") || lower.includes("local")) return "local_commercial";
  return "autre";
}

/**
 * Détecte si un bien est d'investissement
 */
function isInvestmentProperty(annonce: PAPBien): boolean {
  const lower = annonce.titre.toLowerCase() + " " + annonce.description.toLowerCase();
  return !!(
    lower.includes("investissement") ||
    lower.includes("locatif") ||
    lower.includes("rendement") ||
    lower.includes("immeuble") ||
    lower.includes("rapport") ||
    (annonce.nbPieces && annonce.nbPieces >= 3)
  );
}

/**
 * Lance le scraper PAP complet
 */
export async function runPAPScraperJob(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    console.log("[PAP Scraper] Démarrage du scraper...");

    // Scraper les annonces
    const annonces = await scrapePAPBiens();
    console.log(`[PAP Scraper] ${annonces.length} annonces trouvées`);

    if (annonces.length === 0) {
      console.log("[PAP Scraper] Aucune annonce trouvée");
      return;
    }

    // Créer les biens
    const { created, skipped } = await createScrapedBiens(annonces);
    console.log(`[PAP Scraper] ${created} biens créés, ${skipped} ignorés`);

    // Marquer les biens disparus
    const marked = await markMissingBiensAsSold();
    console.log(`[PAP Scraper] ${marked} biens marqués comme vendus`);

    // Notification (seulement si des biens ont été créés)
    if (created > 0) {
      await notifyOwner({
        title: "Scrape PAP complété",
        content: `${created} biens créés, ${skipped} ignorés (doublons), ${marked} marqués comme vendus`,
      });
    }

    console.log("[PAP Scraper] Scraper terminé avec succès");
  } catch (error) {
    console.error("[PAP Scraper] Erreur:", error);
    await notifyOwner({
      title: "Erreur scrape PAP",
      content: String(error),
    });
  }
}
