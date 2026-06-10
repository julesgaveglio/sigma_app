import { Link } from "wouter";
import { ArrowRight, Briefcase, Building2, Lock, Zap, TrendingUp } from "lucide-react";

const LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo-full_c217e268.png";
const BG_CITY = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/XSTQvvt1cO08_530224bb.jpg";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#F0D080";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">

      {/* ─── HERO ─── */}
      <section
        className="relative min-h-screen flex flex-col"
        style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #111 40%, #0f0c05 100%)" }}
      >
        {/* Fond ville */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${BG_CITY})`,
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] opacity-80" />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
          <img src={LOGO_FULL} alt="Sigma Factory" className="h-9 object-contain" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Espace équipe</span>
          </Link>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">

          {/* Badge accrocheur */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{
              background: "rgba(201,168,76,0.1)",
              borderColor: "rgba(201,168,76,0.3)",
              color: GOLD,
            }}
          >
            <Zap className="w-3 h-3" />
            Boostez votre performance
          </div>

          {/* Titre */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            <span className="text-white">Bienvenue chez </span>
            <span
              style={{
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Sigma Factory
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
            Rejoignez un réseau d'experts qui génèrent en moyenne <span style={{ color: GOLD }} className="font-semibold">+30% de chiffre d'affaires supplémentaire</span> dès la première année.
          </p>

          {/* Deux CTA principaux */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/inscription-courtier"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
                  color: "#000",
                }}
              >
                <Briefcase className="w-4 h-4" />
                Espace Courtier
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Déjà inscrit ? Se connecter
              </Link>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/ambassadeur"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm border transition-all hover:border-[#C9A84C] hover:text-[#C9A84C] hover:scale-[1.02]"
                style={{
                  borderColor: "rgba(201,168,76,0.4)",
                  color: "rgba(201,168,76,0.8)",
                }}
              >
                <Building2 className="w-4 h-4" />
                Espace Agent Immo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Déjà inscrit ? Se connecter
              </Link>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-2 text-zinc-600 text-xs">
            <span>Découvrez nos espaces</span>
            <div className="w-px h-8 bg-gradient-to-b from-zinc-600 to-transparent" />
          </div>
        </div>
      </section>

      {/* ─── DEUX ESPACES ─── */}
      <section className="relative bg-[#0a0a0a] px-6 md:px-12 py-20">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16"
          style={{ background: `linear-gradient(to bottom, ${GOLD}, transparent)` }}
        />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Votre espace professionnel
            </h2>
            <p className="text-zinc-500 text-sm">
              Accédez à votre tableau de bord et gérez vos dossiers en toute simplicité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Courtier */}
            <Link
              href="/login"
              className="group relative block rounded-2xl border p-8 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "rgba(201,168,76,0.04)",
                borderColor: "rgba(201,168,76,0.2)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(201,168,76,0.12)" }}
              >
                <Briefcase className="w-6 h-6" style={{ color: GOLD }} />
              </div>

              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                Courtier
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">
                Accédez à vos dossiers de financement
              </h3>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Consultez les dossiers qui vous sont assignés, suivez leur avancement et communiquez directement avec l'équipe Sigma Factory.
              </p>

              <div
                className="flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                style={{ color: GOLD }}
              >
                Accéder à mon espace
                <ArrowRight className="w-4 h-4" />
              </div>

              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.08) 0%, transparent 70%)",
                }}
              />
            </Link>

            {/* Agent Immo */}
            <Link
              href="/ambassadeur"
              className="group relative block rounded-2xl border p-8 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "rgba(201,168,76,0.04)",
                borderColor: "rgba(201,168,76,0.2)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(201,168,76,0.12)" }}
              >
                <Building2 className="w-6 h-6" style={{ color: GOLD }} />
              </div>

              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                Agent Immobilier
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">
                Gérez vos biens et vos clients
              </h3>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Soumettez vos biens, suivez vos dossiers clients et développez votre activité avec le soutien du réseau Sigma Factory.
              </p>

              <div
                className="flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                style={{ color: GOLD }}
              >
                Accéder à mon espace
                <ArrowRight className="w-4 h-4" />
              </div>

              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.08) 0%, transparent 70%)",
                }}
              />
            </Link>

          </div>
        </div>
      </section>

      {/* ─── STAT PERFORMANCE ─── */}
      <section
        className="relative py-20 px-6 md:px-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0c05 0%, #0a0a0a 50%, #0f0c05 100%)" }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{
              background: "rgba(201,168,76,0.1)",
              borderColor: "rgba(201,168,76,0.3)",
              color: GOLD,
            }}
          >
            <TrendingUp className="w-3 h-3" />
            Résultats partenaires
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            Des partenaires qui{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              performent
            </span>
          </h2>

          <p className="text-zinc-400 text-lg mb-12 max-w-xl mx-auto">
            Nos partenaires courtiers et agents immo bénéficient d'un flux régulier de dossiers qualifiés et d'outils pensés pour maximiser leur efficacité.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inscription-courtier"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
                color: "#000",
              }}
            >
              <Briefcase className="w-4 h-4" />
              Rejoindre en tant que courtier
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ambassadeur"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all hover:border-[#C9A84C] hover:text-[#C9A84C]"
              style={{
                borderColor: "rgba(201,168,76,0.3)",
                color: "rgba(201,168,76,0.7)",
              }}
            >
              <Building2 className="w-4 h-4" />
              Rejoindre en tant qu'agent
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-zinc-900 py-10 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img src={LOGO_FULL} alt="Sigma Factory" className="h-7 object-contain opacity-60" />
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>© {new Date().getFullYear()} Sigma Factory</span>
            <span>·</span>
            <span>Tous droits réservés</span>
            <span>·</span>
            <a href="/politique-confidentialite" className="hover:text-zinc-400 transition-colors underline underline-offset-2">Politique de confidentialité</a>
            <span>·</span>
            <a href="/mentions-legales" className="hover:text-zinc-400 transition-colors underline underline-offset-2">Mentions légales</a>
            <span>·</span>
            <a href="/login?forgot=1" className="hover:text-zinc-400 transition-colors underline underline-offset-2">Mot de passe oublié</a>
            <span>·</span>
            <span>ORIAS n°19000655</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
