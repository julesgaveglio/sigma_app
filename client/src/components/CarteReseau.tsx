import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
// Couleur dorée Sigma
const GOLD = "#C9A84C";

type FilterKey = "agent" | "courtier" | "bien" | "offMarket";
const LABELS: Record<FilterKey, string> = {
  agent:     "Agents",
  courtier:  "Courtiers",
  bien:      "Biens immo",
  offMarket: "Off Market",
};
const COLORS: Record<FilterKey, string> = {
  agent:     GOLD,
  courtier:  GOLD,
  bien:      GOLD,
  offMarket: GOLD,
};

// ─── Contour de la France métropolitaine ─────────────────────────────────────
// Coordonnées [lng, lat] — sens horaire
// On utilise directement lng/lat comme coordonnées SVG (lat inversée pour Y)
const FRANCE_COORDS: [number, number][] = [
  [2.55, 51.10],  // Dunkerque
  [2.10, 51.00],  // Calais
  [1.60, 50.95],  // Boulogne
  [1.30, 50.85],
  [0.35, 50.75],  // Dieppe
  [-0.10, 49.65], // Le Havre
  [-1.15, 49.35], // Cherbourg
  [-1.85, 49.22], // Cotentin ouest
  [-2.00, 48.65], // Granville
  [-2.40, 48.62],
  [-3.00, 48.60], // Saint-Malo
  [-4.00, 48.45], // Morlaix
  [-4.78, 48.38], // Brest
  [-4.60, 47.85], // Crozon
  [-4.35, 47.75],
  [-3.55, 47.50], // Lorient
  [-2.75, 47.50], // Vannes
  [-2.50, 47.30],
  [-2.20, 47.28], // Saint-Nazaire
  [-2.18, 47.00],
  [-2.20, 46.80], // La Baule
  [-2.00, 46.50], // Noirmoutier
  [-1.80, 46.40],
  [-1.50, 46.20], // Les Sables-d'Olonne
  [-1.20, 46.15],
  [-1.25, 45.80], // La Rochelle
  [-1.10, 45.70],
  [-1.15, 45.50], // Royan
  [-1.05, 45.35],
  [-0.95, 45.10], // Bordeaux (estuaire)
  [-1.10, 44.70],
  [-1.25, 44.50], // Arcachon
  [-1.30, 44.00],
  [-1.50, 43.55], // Bayonne
  [-1.75, 43.40], // Hendaye
  [-1.75, 43.35],
  [-0.30, 42.85], // Col du Somport
  [0.70, 42.70],  // Andorre
  [1.45, 42.60],  // Andorre est
  [2.85, 42.45],  // Perpignan
  [3.15, 42.43],  // Côte Vermeille
  [3.25, 43.10],  // Narbonne
  [3.70, 43.40],  // Montpellier
  [4.05, 43.70],  // Sète
  [4.40, 43.50],  // Aigues-Mortes
  [4.85, 43.35],  // Marseille ouest
  [5.35, 43.20],  // Marseille
  [5.80, 43.10],  // Toulon
  [6.15, 43.00],
  [6.85, 43.15],  // Cannes
  [7.10, 43.42],  // Nice
  [7.50, 43.77],  // Menton
  [7.65, 44.10],
  [7.00, 44.20],
  [6.85, 44.50],
  [6.65, 44.85],
  [6.75, 45.15],  // Col du Mont-Cenis
  [6.60, 45.35],
  [6.80, 45.80],  // Mont-Blanc
  [6.90, 46.00],
  [6.95, 46.40],  // Genève
  [6.25, 46.38],
  [6.15, 46.55],
  [6.00, 46.70],
  [5.95, 46.90],
  [6.10, 47.25],  // Belfort
  [7.00, 47.55],  // Mulhouse
  [7.55, 47.60],  // Bâle
  [7.55, 47.85],
  [7.75, 48.10],  // Strasbourg
  [7.80, 48.60],
  [7.65, 49.00],  // Wissembourg
  [6.35, 49.45],  // Luxembourg
  [5.80, 49.55],
  [5.50, 49.60],
  [5.15, 49.55],  // Thionville
  [4.85, 49.50],
  [4.15, 49.95],  // Charleville
  [3.70, 50.35],  // Valenciennes
  [3.15, 50.75],  // Lille
  [2.55, 51.10],  // Dunkerque — fermeture
];

// Bornes géographiques de la France (avec marges)
const GEO_MIN_LNG = -5.8;
const GEO_MAX_LNG = 8.2;
const GEO_MIN_LAT = 42.0;
const GEO_MAX_LAT = 51.5;
const GEO_W = GEO_MAX_LNG - GEO_MIN_LNG;  // 14.0
const GEO_H = GEO_MAX_LAT - GEO_MIN_LAT;  // 9.5

// Convertir [lng, lat] → [x, y] dans l'espace géographique normalisé
// x = lng relatif, y = lat inversée (haut = nord)
function geoToPath(coords: [number, number][]): string {
  const pts = coords.map(([lng, lat]) => {
    const x = ((lng - GEO_MIN_LNG) / GEO_W * 100).toFixed(2);
    const y = ((1 - (lat - GEO_MIN_LAT) / GEO_H) * 100).toFixed(2);
    return `${x},${y}`;
  });
  return "M " + pts.join(" L ") + " Z";
}

// Convertir coordonnées GPS → coordonnées dans l'espace normalisé [0-100, 0-100]
function gpsToNorm(lat: number, lng: number): [number, number] {
  const x = (lng - GEO_MIN_LNG) / GEO_W * 100;
  const y = (1 - (lat - GEO_MIN_LAT) / GEO_H) * 100;
  return [x, y];
}

// ─── Hexagone flat-top ────────────────────────────────────────────────────────
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(" ");
}

type TooltipState = { x: number; y: number; label: string; color: string } | null;
type PointData = { x: number; y: number; key: FilterKey; label: string; color: string; id?: number };

// ─── Composant ───────────────────────────────────────────────────────────────
export function CarteReseau({ isVisible = true }: { isVisible?: boolean }) {
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({ agent: true, courtier: true, bien: true, offMarket: true });
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [, navigate] = useLocation();

  const { data, refetch, isFetching } = trpc.ambassadeurs.getCarteReseau.useQuery(undefined, { staleTime: 30 * 1000, refetchOnWindowFocus: true });

  const toggleFilter = (key: FilterKey) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  // Dimensions SVG totales
  const W = 640;
  const H = 620;
  const CX = W / 2;        // 320
  const CY = H / 2;        // 310
  const R = 285;            // rayon hexagone (un peu moins que H/2 pour laisser de la marge)
  const R_INNER = R - 4;   // rayon intérieur (après la bordure)

  // Zone de la carte France à l'intérieur de l'hexagone
  const MAP_W = R * 1.55;
  const MAP_H = R * 1.45;
  const MAP_X = CX - MAP_W / 2 - 18;
  const MAP_Y = CY - MAP_H / 2 - 15;

  // Convertir coordonnées normalisées [0-100] → coordonnées SVG
  function normToSvg(nx: number, ny: number): [number, number] {
    return [MAP_X + (nx / 100) * MAP_W, MAP_Y + (ny / 100) * MAP_H];
  }

  // Construire les points GPS
  const points: PointData[] = [];

  if (data && filters.agent) {
    data.agents.forEach((a: any) => {
      const lat = parseFloat(String(a.latitude));
      const lng = parseFloat(String(a.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        const [nx, ny] = gpsToNorm(lat, lng);
        const [x, y] = normToSvg(nx, ny);
        points.push({ x, y, key: "agent", label: `${a.prenom} ${a.nom} — ${a.ville}`, color: GOLD });
      }
    });
  }
  if (data && filters.courtier) {
    data.courtiers_.forEach((c: any) => {
      const lat = parseFloat(String(c.latitude));
      const lng = parseFloat(String(c.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        const [nx, ny] = gpsToNorm(lat, lng);
        const [x, y] = normToSvg(nx, ny);
        points.push({ x, y, key: "courtier", label: `${c.denominationSociale || c.prenom + " " + c.nom} — ${c.ville}`, color: GOLD });
      }
    });
  }
  if (data && filters.bien) {
    // Décaler les points superposés (même coordonnées GPS) en spirale
    const bienCoordCount: Record<string, number> = {};
    data.biens_.forEach((b: any) => {
      const lat = parseFloat(String(b.latitude));
      const lng = parseFloat(String(b.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        const [nx, ny] = gpsToNorm(lat, lng);
        const [x, y] = normToSvg(nx, ny);
        const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
        const idx = bienCoordCount[coordKey] ?? 0;
        bienCoordCount[coordKey] = idx + 1;
        // Décalage spiral : 0 = centre, 1+ = autour à 14px
        const OFFSET = 14;
        const angle = idx * (2 * Math.PI / 6);
        const dx = idx === 0 ? 0 : Math.cos(angle) * OFFSET;
        const dy = idx === 0 ? 0 : Math.sin(angle) * OFFSET;
        points.push({ x: x + dx, y: y + dy, key: "bien", label: `${b.titre} — ${b.ville}`, color: GOLD, id: b.id });
      }
    });
  }
  if (data && filters.offMarket) {
    // Décaler les points Off Market superposés
    const omCoordCount: Record<string, number> = {};
    (data.offMarket ?? []).forEach((b: any) => {
      const lat = parseFloat(String(b.latitude));
      const lng = parseFloat(String(b.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        const [nx, ny] = gpsToNorm(lat, lng);
        const [x, y] = normToSvg(nx, ny);
        const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
        const idx = omCoordCount[coordKey] ?? 0;
        omCoordCount[coordKey] = idx + 1;
        const OFFSET = 12;
        const angle = idx * (2 * Math.PI / 6);
        const dx = idx === 0 ? 0 : Math.cos(angle) * OFFSET;
        const dy = idx === 0 ? 0 : Math.sin(angle) * OFFSET;
        const fmtPrice = b.prixBien ? ` — ${new Intl.NumberFormat("fr-FR").format(b.prixBien)} €` : "";
        points.push({ x: x + dx, y: y + dy, key: "offMarket", label: `💎 ${b.titre}${fmtPrice}`, color: GOLD, id: b.id });
      }
    });
  }

  const counts = {
    agent:     data?.agents.filter((a: any) => a.latitude && a.longitude).length ?? 0,
    courtier:  data?.courtiers_.filter((c: any) => c.latitude && c.longitude).length ?? 0,
    bien:      data?.biens_.filter((b: any) => b.latitude && b.longitude).length ?? 0,
    offMarket: (data?.offMarket ?? []).filter((b: any) => b.latitude && b.longitude).length,
  };
  const total = counts.agent + counts.courtier + counts.bien + counts.offMarket;

  // Construire le path de la France dans l'espace SVG
  const franceSvgPath = (() => {
    const pts = FRANCE_COORDS.map(([lng, lat]) => {
      const [nx, ny] = gpsToNorm(lat, lng);
      const [x, y] = normToSvg(nx, ny);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return "M " + pts.join(" L ") + " Z";
  })();

  const hexPts = hexPoints(CX, CY, R);
  const hexPtsInner = hexPoints(CX, CY, R_INNER);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(LABELS) as FilterKey[]).map(key => {
          const color = COLORS[key];
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border transition-all"
              style={{
                borderColor: filters[key] ? color : "#2a2a2a",
                backgroundColor: filters[key] ? `${color}1a` : "transparent",
                color: filters[key] ? color : "#444",
                letterSpacing: "0.06em",
              }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{
                  backgroundColor: color,
                  boxShadow: filters[key] ? `0 0 6px ${color}` : "none",
                  opacity: filters[key] ? 1 : 0.25,
                }}
              />
              {LABELS[key]}
              <span style={{ opacity: 0.5 }}>({counts[key]})</span>
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-3 text-xs" style={{ color: "#333" }}>
          {total} point{total > 1 ? "s" : ""} sur la carte
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              background: "transparent",
              border: `1px solid ${isFetching ? "#2a2a2a" : "rgba(201,168,76,0.3)"}`,
              color: isFetching ? "#444" : GOLD,
              fontSize: 11,
              padding: "3px 10px",
              cursor: isFetching ? "default" : "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {isFetching ? "..." : "↻ Actualiser"}
          </button>
        </span>
      </div>

      {/* SVG hexagonal */}
      <div className="flex justify-center" style={{ position: "relative" }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", maxWidth: "100%" }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            {/* Gradient doré pour la bordure */}
            <linearGradient id="hexGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#f0d878" />
              <stop offset="30%"  stopColor="#C9A84C" />
              <stop offset="60%"  stopColor="#8B6914" />
              <stop offset="100%" stopColor="#e8c96a" />
            </linearGradient>

            {/* Clip hexagonal */}
            <clipPath id="hexClip">
              <polygon points={hexPtsInner} />
            </clipPath>

            {/* Gradient radial pour le halo des points dorés */}
            <radialGradient id="dotHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0.55" />
              <stop offset="50%"  stopColor={GOLD} stopOpacity="0.12" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>



            {/* Gradient sphérique pour le point central doré */}
            <radialGradient id="dotCore" cx="35%" cy="30%" r="65%">
              <stop offset="0%"   stopColor="#fff9e0" />
              <stop offset="40%"  stopColor={GOLD} />
              <stop offset="100%" stopColor="#6a4a08" />
            </radialGradient>



            {/* Filtre glow */}
            <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>



            {/* Reflet en haut de l'hexagone */}
            <linearGradient id="hexSheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0.07" />
              <stop offset="25%"  stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── Bordure hexagonale dorée ── */}
          <polygon points={hexPts} fill="url(#hexGold)" />

          {/* ── Fond noir intérieur ── */}
          <polygon points={hexPtsInner} fill="#000000" />

          {/* ── Contour de la France (clippé) ── */}
          <g clipPath="url(#hexClip)">
            <path
              d={franceSvgPath}
              fill="rgba(201,168,76,0.05)"
              stroke={GOLD}
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          {/* ── Points (clippés) ── */}
          <g clipPath="url(#hexClip)">
            {points.map((pt, i) => {
              return (
                  <g
                  key={i}
                  style={{ cursor: (pt.key === "offMarket" || pt.key === "bien") ? "pointer" : "default" }}
                  onClick={() => {
                    if (pt.key === "offMarket" && pt.id) {
                      navigate(`/dashboard/off-market?id=${pt.id}`);
                    } else if (pt.key === "bien" && pt.id) {
                      navigate(`/dashboard/reseau?tab=biens&bienId=${pt.id}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const svgEl = e.currentTarget.closest("svg") as SVGSVGElement;
                    const rect = svgEl.getBoundingClientRect();
                    const scaleX = rect.width / W;
                    const scaleY = rect.height / H;
                    const isClickable = pt.key === "offMarket" || pt.key === "bien";
                    setTooltip({
                      x: pt.x * scaleX,
                      y: pt.y * scaleY,
                      label: isClickable ? `${pt.label} — Cliquer pour voir la fiche` : pt.label,
                      color: pt.color,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle cx={pt.x} cy={pt.y} r={16} fill="url(#dotHalo)" />
                  <circle cx={pt.x} cy={pt.y} r={7}  fill={pt.color} fillOpacity={0.15} />
                  <circle cx={pt.x} cy={pt.y} r={4.5} fill="url(#dotCore)" filter="url(#glow)" />
                  <circle cx={pt.x - 1.2} cy={pt.y - 1.2} r={1} fill="white" fillOpacity={0.7} />
                </g>
              );
            })}
          </g>

          {/* ── Reflet lumineux haut ── */}
          <polygon
            points={hexPtsInner}
            fill="url(#hexSheen)"
            style={{ pointerEvents: "none" }}
          />

          {/* ── Label SIGMA FACTORY ── */}
          <text
            x={CX}
            y={CY + R * 0.72}
            textAnchor="middle"
            fill={GOLD}
            fillOpacity={0.25}
            fontSize={9}
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            letterSpacing={4}
            style={{ pointerEvents: "none" }}
          >
            SIGMA FACTORY
          </text>
        </svg>

        {/* Tooltip HTML */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y - 40,
              transform: "translateX(-50%)",
              background: "#0d0d0d",
              color: tooltip.color,
              padding: "5px 12px",
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              borderRadius: 3,
              whiteSpace: "nowrap",
              border: `1px solid ${tooltip.color}4d`,
              letterSpacing: "0.04em",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {tooltip.label}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 text-xs" style={{ color: "#444" }}>
        {(Object.keys(LABELS) as FilterKey[]).map(key => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLORS[key], boxShadow: `0 0 4px ${COLORS[key]}` }}
            />
            {LABELS[key]}
          </span>
        ))}
        <span className="opacity-40 ml-2">Survolez un point</span>
      </div>
    </div>
  );
}
