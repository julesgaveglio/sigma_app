import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Home, CreditCard, Users, TrendingUp, Shield, CheckCircle, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

export default function PageParrainage() {
  const [, params] = useRoute("/parrainage/:code");
  const [, navigate] = useLocation();
  const code = params?.code ?? "";
  const [copied, setCopied] = useState(false);

  // Résoudre le parrain
  const { data: parrain, isLoading } = trpc.courtiers.resoudreParrain.useQuery(
    { code },
    { enabled: !!code }
  );

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const goAgent = () => navigate(`/ambassadeur?parrain=${encodeURIComponent(code)}`);
  const goCourtier = () => navigate(`/inscription-courtier?parrain=${encodeURIComponent(code)}`);

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", color: "#F0EDE6" }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid #1E1E1E",
        background: "#0A0A0A",
      }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              lineHeight: 1,
              color: "#F0EDE6",
              margin: 0,
              textTransform: "uppercase" as const,
            }}>
              SIGMA FACTORY
            </h1>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "10px",
              color: "#3A3632",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              marginTop: "4px",
            }}>
              Conseil en immobilier & financement
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#C9A84C",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}>
              Programme d'affiliation
            </div>
            <div style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#6B6560",
              marginTop: "2px",
            }}>
              Invitation personnelle
            </div>
          </div>
        </div>
      </header>

      {/* ── Bloc parrain ── */}
      <div style={{
        borderBottom: "1px solid #1E1E1E",
        padding: "48px 24px",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          {isLoading ? (
            <div style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              color: "#6B6560",
            }}>
              Chargement...
            </div>
          ) : parrain ? (
            <>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "8px 16px",
                marginBottom: "20px",
              }}>
                <CheckCircle size={14} style={{ color: "#4A7A5A" }} />
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "#4A7A5A",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                }}>
                  Invitation validee
                </span>
              </div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                {parrain.nom} vous invite a rejoindre le reseau
              </h2>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "14px",
                color: "#6B6560",
                marginBottom: "24px",
                lineHeight: "1.6",
              }}>
                {parrain.type === "agent"
                  ? "Agent Immobilier Sigma Factory"
                  : parrain.type === "courtier"
                  ? "Courtier Partenaire Sigma Factory"
                  : "Sigma Factory"}
              </p>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "14px 20px",
              }}>
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "11px",
                  color: "#6B6560",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                }}>
                  Code parrain
                </span>
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#C9A84C",
                  letterSpacing: "0.12em",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {parrain.code}
                </span>
                <button
                  onClick={copyLink}
                  className="transition-opacity duration-300 ease-out hover:opacity-70"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6B6560",
                    cursor: "pointer",
                    padding: "0",
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </>
          ) : code ? (
            <>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "8px 16px",
                marginBottom: "20px",
              }}>
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "#6B6560",
                }}>
                  Code non reconnu
                </span>
              </div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                Rejoignez le reseau Sigma Factory
              </h2>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "14px",
                color: "#6B6560",
                lineHeight: "1.6",
              }}>
                Inscrivez-vous en tant qu'agent ou courtier partenaire.
              </p>
            </>
          ) : (
            <>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                Rejoignez le reseau Sigma Factory
              </h2>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "14px",
                color: "#6B6560",
                lineHeight: "1.6",
              }}>
                Inscrivez-vous en tant qu'agent ou courtier partenaire.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "32px",
            fontWeight: 600,
            color: "#F0EDE6",
            letterSpacing: "0.04em",
            marginBottom: "16px",
          }}>
            Un reseau d'affiliation a 2 niveaux
          </h3>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "15px",
            color: "#6B6560",
            maxWidth: "560px",
            margin: "0 auto",
            lineHeight: "1.6",
          }}>
            Rejoignez Sigma Factory et percevez des retrocommissions sur chaque transaction de votre reseau.
          </p>
        </div>

        {/* ── Avantages — 2 colonnes ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          maxWidth: "900px",
          margin: "0 auto 56px",
        }}>
          {/* Agent */}
          <div style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "2px",
            padding: "32px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <Home size={16} style={{ color: "#6B6560" }} />
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#6B6560",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>
                Agent Immobilier
              </span>
            </div>
            {[
              { icon: TrendingUp, title: "50% des honoraires", desc: "Vous conservez 50% de chaque commission generee sur vos dossiers immobiliers." },
              { icon: Users, title: "10% sur vos filleuls N1", desc: "Percevez 10% de retrocommission sur chaque vente de vos filleuls directs." },
              { icon: TrendingUp, title: "5% sur le reseau N2", desc: "Percevez 5% sur les ventes des filleuls de vos filleuls." },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: i < 2 ? "20px" : "0",
              }}>
                <item.icon size={16} style={{ color: "#3A3632", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <p style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#F0EDE6",
                    marginBottom: "4px",
                  }}>
                    {item.title}
                  </p>
                  <p style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "12px",
                    color: "#6B6560",
                    lineHeight: "1.6",
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Courtier */}
          <div style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "2px",
            padding: "32px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <CreditCard size={16} style={{ color: "#6B6560" }} />
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#6B6560",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>
                Courtier Partenaire
              </span>
            </div>
            {[
              { icon: TrendingUp, title: "75% des honoraires", desc: "Vous conservez 75% de chaque commission generee sur vos dossiers de financement." },
              { icon: Users, title: "10% sur vos filleuls N1", desc: "Percevez 10% de retrocommission sur chaque dossier de vos filleuls directs." },
              { icon: TrendingUp, title: "5% sur le reseau N2", desc: "Percevez 5% sur les dossiers des filleuls de vos filleuls." },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: i < 2 ? "20px" : "0",
              }}>
                <item.icon size={16} style={{ color: "#3A3632", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <p style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#F0EDE6",
                    marginBottom: "4px",
                  }}>
                    {item.title}
                  </p>
                  <p style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "12px",
                    color: "#6B6560",
                    lineHeight: "1.6",
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          maxWidth: "640px",
          margin: "0 auto",
        }}>
          <button
            onClick={goAgent}
            className="transition-opacity duration-300 ease-out"
            style={{
              background: "#C9A84C",
              color: "#0A0A0A",
              border: "none",
              borderRadius: "2px",
              padding: "32px 24px",
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Home size={24} style={{ marginBottom: "16px" }} />
            <h4 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginBottom: "8px",
            }}>
              Agent Immobilier
            </h4>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "rgba(10,10,10,0.6)",
              lineHeight: "1.6",
              marginBottom: "16px",
            }}>
              Soumettez des biens, accompagnez des clients et developpez votre reseau d'agents.
            </p>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>
              Rejoindre <ArrowRight size={14} />
            </div>
          </button>

          <button
            onClick={goCourtier}
            className="transition-colors duration-300 ease-out"
            style={{
              background: "#111111",
              color: "#F0EDE6",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              padding: "32px 24px",
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#C9A84C")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
          >
            <CreditCard size={24} style={{ marginBottom: "16px", color: "#6B6560" }} />
            <h4 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginBottom: "8px",
            }}>
              Courtier Partenaire
            </h4>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#6B6560",
              lineHeight: "1.6",
              marginBottom: "16px",
            }}>
              Apportez des dossiers de financement et percevez vos honoraires + retrocommissions.
            </p>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#6B6560",
            }}>
              Rejoindre <ArrowRight size={14} />
            </div>
          </button>
        </div>

        {/* ── Sigma info ── */}
        <div style={{
          marginTop: "56px",
          background: "#111111",
          border: "1px solid #1E1E1E",
          borderRadius: "2px",
          padding: "24px 28px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          maxWidth: "640px",
          margin: "56px auto 0",
        }}>
          <Shield size={20} style={{ color: "#3A3632", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#6B6560",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              marginBottom: "8px",
            }}>
              Sigma Factory SAS
            </p>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#3A3632",
              lineHeight: "1.8",
            }}>
              Capital 5 000 EUR — RCS Lyon 999 672 777 — Carte pro CPI69012026000000022 — CCI Lyon Metropole<br />
              12 Rue de la Part-Dieu, 69003 Lyon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
