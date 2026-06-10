/**
 * Helper de géocodage côté serveur
 * Utilise l'API Google Maps directement pour convertir une adresse en coordonnées GPS
 */
import { makeRequest } from "./_core/map";

export interface GeoCoords {
  latitude: string;
  longitude: string;
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    geometry: {
      location: { lat: number; lng: number };
    };
  }>;
}

/**
 * Géocode une adresse française et retourne les coordonnées GPS.
 * Retourne null si le géocodage échoue (adresse introuvable, erreur réseau, etc.)
 */
export async function geocodeAdresse(
  adresse: string,
  codePostal: string,
  ville: string
): Promise<GeoCoords | null> {
  try {
    // Essai 1 : adresse complète
    const fullAddress = `${adresse}, ${codePostal} ${ville}, France`;
    const data = await makeRequest<GeocodingResponse>(
      "/maps/api/geocode/json",
      { address: fullAddress }
    );

    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat.toString(), longitude: lng.toString() };
    }

    // Essai 2 : code postal + ville uniquement (fallback)
    const fallback = await makeRequest<GeocodingResponse>(
      "/maps/api/geocode/json",
      { address: `${codePostal} ${ville}, France` }
    );

    if (fallback.status === "OK" && fallback.results.length > 0) {
      const { lat, lng } = fallback.results[0].geometry.location;
      return { latitude: lat.toString(), longitude: lng.toString() };
    }

    console.warn(`[geocode] Aucun résultat pour: ${adresse}, ${codePostal} ${ville}`);
    return null;
  } catch (err) {
    console.error("[geocode] Erreur:", err);
    return null;
  }
}
