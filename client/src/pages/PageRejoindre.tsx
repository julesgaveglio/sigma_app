import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Building2, Users, ArrowRight, CheckCircle, Loader2, Star } from "lucide-react";

export default function PageRejoindre() {
  const [codeParrain, setCodeParrain] = useState<string | null>(null);
  const [choix, setChoix] = useState<"agent" | "courtier" | null>(null);

  // Lire le code parrain depuis l'URL (?parrain=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("parrain");
    if (code) setCodeParrain(code);
  }, []);

  // Résoudre le parrain si code présent
  const { data: parrainData, isLoading: parrainLoading } = trpc.courtiers.resoudreParrain.useQuery(
    { code: codeParrain! },
    { enabled: !!codeParrain }
  );

  // Redirection vers le bon formulaire avec code parrain pré-rempli
  const handleChoix = (type: "agent" | "courtier") => {
    setChoix(type);
    const base = type === "agent" ? "/ambassadeur" : "/inscription-courtier";
    const url = codeParrain ? `${base}?parrain=${encodeURIComponent(codeParrain)}` : base;
    setTimeout(() => { window.location.href = url; }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
         style={{ background: "var(--background)", padding: "24px" }}>

      {/* ── Logo ── */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <p style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--gold)",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          marginBottom: "12px",
        }}>
          Sigma Factory
        </p>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "32px",
          fontWeight: 600,
          color: "var(--foreground)",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Rejoindre le reseau
        </h1>
      </div>

      {/* ── Banniere parrain ── */}
      {codeParrain && (
        <div style={{ width: "100%", maxWidth: "460px", marginBottom: "32px" }}>
          {parrainLoading ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "16px",
            }}>
              <Loader2 size={16} style={{ color: "var(--foreground-muted)" }} className="animate-spin" />
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "13px",
                color: "var(--foreground-muted)",
              }}>
                Verification du parrain...
              </span>
            </div>
          ) : parrainData && parrainData.type !== "sigma" ? (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <CheckCircle size={16} style={{ color: "var(--success)", flexShrink: 0 }} />
              <div>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "2px",
                }}>
                  Invitation de {parrainData.nom}
                </p>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted)",
                }}>
                  Vous beneficiez d'un accompagnement personnalise des votre arrivee
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              background: "var(--surface-header)",
              border: "1px solid #3A1E1E",
              borderRadius: "2px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "13px",
                color: "var(--destructive)",
              }}>
                Code parrain non reconnu — vous pouvez tout de meme rejoindre le reseau
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Avantages ── */}
      <div style={{ width: "100%", maxWidth: "460px", marginBottom: "32px" }}>
        {[
          "Acces a un reseau de partenaires qualifies",
          "Commissions attractives sur chaque dossier",
          "Espace dedie pour suivre vos dossiers en temps reel",
          "Support et accompagnement de l'equipe Sigma",
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}>
            <Star size={12} style={{ color: "var(--foreground-faint)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              color: "var(--foreground-muted)",
            }}>
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* ── Choix du type ── */}
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <p style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--foreground-faint)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          textAlign: "center",
          marginBottom: "16px",
        }}>
          Choisissez votre profil
        </p>

        {/* Agent Immo */}
        <button
          onClick={() => handleChoix("agent")}
          disabled={choix !== null}
          className="transition-colors duration-300 ease-out"
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "24px",
            textAlign: "left",
            cursor: choix !== null ? "not-allowed" : "pointer",
            opacity: choix !== null ? 0.6 : 1,
            marginBottom: "12px",
          }}
          onMouseEnter={e => { if (!choix) e.currentTarget.style.borderColor = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Building2 size={20} style={{ color: "var(--foreground-muted)" }} />
              </div>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  letterSpacing: "0.02em",
                  marginBottom: "4px",
                }}>
                  Agent Immobilier
                </p>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted)",
                }}>
                  50% de retrocommission sur chaque vente
                </p>
              </div>
            </div>
            {choix === "agent" ? (
              <Loader2 size={16} style={{ color: "var(--foreground-muted)" }} className="animate-spin" />
            ) : (
              <ArrowRight size={16} style={{ color: "var(--foreground-faint)" }} />
            )}
          </div>
          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {["Biens immobiliers", "Reseau agents", "Suivi dossiers"].map(tag => (
              <span key={tag} style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--foreground-muted)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "4px 8px",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Courtier */}
        <button
          onClick={() => handleChoix("courtier")}
          disabled={choix !== null}
          className="transition-colors duration-300 ease-out"
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "24px",
            textAlign: "left",
            cursor: choix !== null ? "not-allowed" : "pointer",
            opacity: choix !== null ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!choix) e.currentTarget.style.borderColor = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Users size={20} style={{ color: "var(--foreground-muted)" }} />
              </div>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  letterSpacing: "0.02em",
                  marginBottom: "4px",
                }}>
                  Courtier en Financement
                </p>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted)",
                }}>
                  75% de retrocommission sur chaque dossier
                </p>
              </div>
            </div>
            {choix === "courtier" ? (
              <Loader2 size={16} style={{ color: "var(--foreground-muted)" }} className="animate-spin" />
            ) : (
              <ArrowRight size={16} style={{ color: "var(--foreground-faint)" }} />
            )}
          </div>
          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {["Credit immobilier", "Credit pro", "Rachat de credit", "Convention signee"].map(tag => (
              <span key={tag} style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--foreground-muted)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "4px 8px",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <p style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontSize: "11px",
        color: "var(--foreground-faint)",
        textAlign: "center",
        maxWidth: "380px",
        marginTop: "32px",
        lineHeight: "1.6",
      }}>
        En rejoignant le reseau Sigma Factory, vous acceptez nos conditions generales de partenariat.
      </p>
    </div>
  );
}
