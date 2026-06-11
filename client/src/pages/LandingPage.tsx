import { Link } from "wouter";
import { ArrowRight, Briefcase, Building2, Lock } from "lucide-react";

const LOGO_FULL = "/assets/sigma-logo-full.png";
const BG_CITY = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/XSTQvvt1cO08_530224bb.jpg";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* --- HERO --- */}
      <section className="relative min-h-screen flex flex-col">
        {/* Fond ville */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${BG_CITY})`,
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
            opacity: 0.06,
          }}
        />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6" style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          <img src={LOGO_FULL} alt="Sigma Factory" className="object-contain" style={{ height: "52px" }} />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity duration-300 hover:opacity-70"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--foreground-faint)",
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              textDecoration: "none",
            }}
          >
            <Lock className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            <span>Espace equipe</span>
          </Link>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">

          {/* Titre */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--foreground)",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}>
            Sigma Factory
          </h1>

          <div style={{ width: "40px", height: "1px", background: "var(--gold)", margin: "0 auto 32px" }} />

          <p style={{
            fontSize: "16px",
            color: "var(--foreground-muted)",
            maxWidth: "520px",
            lineHeight: "1.7",
            marginBottom: "48px",
          }}>
            Rejoignez un reseau d'experts qui generent en moyenne <span style={{ color: "var(--foreground)", fontWeight: 500 }}>+30% de chiffre d'affaires supplementaire</span> des la premiere annee.
          </p>

          {/* Deux CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/inscription-courtier"
                className="flex items-center justify-center gap-2 transition-opacity duration-300 hover:opacity-80"
                style={{
                  padding: "14px 28px",
                  background: "var(--gold)",
                  color: "var(--background)",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  textDecoration: "none",
                }}
              >
                <Briefcase className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                Espace Courtier
                <ArrowRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </Link>
              <Link href="/login" className="transition-opacity duration-300 hover:opacity-70" style={{ fontSize: "11px", color: "var(--foreground-faint)", textDecoration: "none" }}>
                Deja inscrit ? Se connecter
              </Link>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/ambassadeur"
                className="flex items-center justify-center gap-2 transition-colors duration-300"
                style={{
                  padding: "14px 28px",
                  border: "1px solid rgba(201,168,76,0.3)",
                  color: "var(--gold)",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  textDecoration: "none",
                  background: "transparent",
                }}
              >
                <Building2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                Espace Agent Immo
                <ArrowRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </Link>
              <Link href="/login" className="transition-opacity duration-300 hover:opacity-70" style={{ fontSize: "11px", color: "var(--foreground-faint)", textDecoration: "none" }}>
                Deja inscrit ? Se connecter
              </Link>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-2">
            <span className="label-uppercase" style={{ fontSize: "10px", color: "var(--foreground-faint)" }}>Decouvrez nos espaces</span>
            <div style={{ width: "1px", height: "32px", background: "var(--border)" }} />
          </div>
        </div>
      </section>

      {/* --- DEUX ESPACES --- */}
      <section className="px-6 md:px-12 py-20" style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="text-center mb-16">
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}>
              Votre espace professionnel
            </h2>
            <p style={{ fontSize: "13px", color: "var(--foreground-muted)" }}>
              Accedez a votre tableau de bord et gerez vos dossiers en toute simplicite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Courtier */}
            <Link
              href="/login"
              className="group block transition-colors duration-300"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "32px",
                textDecoration: "none",
              }}
            >
              <Briefcase className="w-5 h-5 mb-4" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />

              <p className="label-uppercase mb-2" style={{ color: "var(--gold)" }}>
                Courtier
              </p>

              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.02em",
                marginBottom: "12px",
                lineHeight: 1.3,
              }}>
                Accedez a vos dossiers de financement
              </h3>

              <p style={{
                fontSize: "13px",
                color: "var(--foreground-muted)",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}>
                Consultez les dossiers qui vous sont assignes, suivez leur avancement et communiquez directement avec l'equipe Sigma Factory.
              </p>

              <div className="flex items-center gap-2 transition-opacity duration-300 group-hover:opacity-80" style={{ color: "var(--gold)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em" }}>
                Acceder a mon espace
                <ArrowRight className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
              </div>
            </Link>

            {/* Agent Immo */}
            <Link
              href="/ambassadeur"
              className="group block transition-colors duration-300"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "32px",
                textDecoration: "none",
              }}
            >
              <Building2 className="w-5 h-5 mb-4" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />

              <p className="label-uppercase mb-2" style={{ color: "var(--gold)" }}>
                Agent Immobilier
              </p>

              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.02em",
                marginBottom: "12px",
                lineHeight: 1.3,
              }}>
                Gerez vos biens et vos clients
              </h3>

              <p style={{
                fontSize: "13px",
                color: "var(--foreground-muted)",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}>
                Soumettez vos biens, suivez vos dossiers clients et developpez votre activite avec le soutien du reseau Sigma Factory.
              </p>

              <div className="flex items-center gap-2 transition-opacity duration-300 group-hover:opacity-80" style={{ color: "var(--gold)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em" }}>
                Acceder a mon espace
                <ArrowRight className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* --- SECTION PERFORMANCE --- */}
      <section className="px-6 md:px-12 py-20" style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" as const }}>
          <p className="label-uppercase mb-4" style={{ color: "var(--foreground-muted)" }}>
            Resultats partenaires
          </p>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 600,
            color: "var(--foreground)",
            letterSpacing: "0.04em",
            marginBottom: "12px",
          }}>
            Des partenaires qui performent
          </h2>

          <p style={{
            fontSize: "14px",
            color: "var(--foreground-muted)",
            lineHeight: "1.7",
            marginBottom: "40px",
            maxWidth: "520px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            Nos partenaires courtiers et agents immo beneficient d'un flux regulier de dossiers qualifies et d'outils penses pour maximiser leur efficacite.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inscription-courtier"
              className="flex items-center justify-center gap-2 transition-opacity duration-300 hover:opacity-80"
              style={{
                padding: "14px 24px",
                background: "var(--gold)",
                color: "var(--background)",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                textDecoration: "none",
              }}
            >
              <Briefcase className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Rejoindre en tant que courtier
              <ArrowRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </Link>
            <Link
              href="/ambassadeur"
              className="flex items-center justify-center gap-2 transition-colors duration-300"
              style={{
                padding: "14px 24px",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "var(--gold)",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                textDecoration: "none",
                background: "transparent",
              }}
            >
              <Building2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Rejoindre en tant qu'agent
              <ArrowRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 24px" }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <img src={LOGO_FULL} alt="Sigma Factory" className="object-contain" style={{ height: "36px", opacity: 0.4 }} />
          <div className="flex items-center gap-4 flex-wrap justify-center" style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.04em", color: "var(--foreground-faint)" }}>
            <span>&copy; {new Date().getFullYear()} Sigma Factory</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>Tous droits reserves</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <a href="/politique-confidentialite" className="transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-faint)", textDecoration: "none" }}>Politique de confidentialite</a>
            <span style={{ color: "var(--border)" }}>·</span>
            <a href="/mentions-legales" className="transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-faint)", textDecoration: "none" }}>Mentions legales</a>
            <span style={{ color: "var(--border)" }}>·</span>
            <a href="/login?forgot=1" className="transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-faint)", textDecoration: "none" }}>Mot de passe oublie</a>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>ORIAS n&deg;19000655</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
