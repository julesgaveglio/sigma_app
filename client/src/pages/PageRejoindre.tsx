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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-[0.3em] mb-1">Sigma Factory</p>
        <h1 className="text-4xl font-black text-white">Rejoindre le réseau</h1>
      </div>

      {/* Bannière parrain */}
      {codeParrain && (
        <div className="w-full max-w-md mb-8">
          {parrainLoading ? (
            <div className="flex items-center justify-center gap-2 bg-[#111] border border-[#C9A84C]/30 p-4">
              <Loader2 className="w-4 h-4 text-[#C9A84C] animate-spin" />
              <span className="text-gray-400 text-sm">Vérification du parrain…</span>
            </div>
          ) : parrainData && parrainData.type !== "sigma" ? (
            <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/40 p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#C9A84C] shrink-0" />
              <div>
                <p className="text-[#C9A84C] font-bold text-sm">Invitation de {parrainData.nom}</p>
                <p className="text-gray-400 text-xs">Vous bénéficiez d'un accompagnement personnalisé dès votre arrivée</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-500/30 p-4 flex items-center gap-3">
              <span className="text-red-400 text-sm">Code parrain non reconnu — vous pouvez tout de même rejoindre le réseau</span>
            </div>
          )}
        </div>
      )}

      {/* Avantages */}
      <div className="w-full max-w-md mb-8 space-y-2">
        {[
          "Accès à un réseau de partenaires qualifiés",
          "Commissions attractives sur chaque dossier",
          "Espace dédié pour suivre vos dossiers en temps réel",
          "Support et accompagnement de l'équipe Sigma",
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Star className="w-3 h-3 text-[#C9A84C] shrink-0" />
            <span className="text-gray-400 text-sm">{item}</span>
          </div>
        ))}
      </div>

      {/* Choix du type */}
      <div className="w-full max-w-md space-y-4">
        <p className="text-gray-500 text-xs uppercase tracking-wider text-center mb-2">Choisissez votre profil</p>

        {/* Agent Immo */}
        <button
          onClick={() => handleChoix("agent")}
          disabled={choix !== null}
          className="w-full group bg-[#111] border border-[#222] hover:border-[#C9A84C]/50 p-6 text-left transition-all disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C9A84C]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Agent Immobilier</p>
                <p className="text-gray-500 text-sm">50% de rétrocommission sur chaque vente</p>
              </div>
            </div>
            {choix === "agent" ? (
              <Loader2 className="w-5 h-5 text-[#C9A84C] animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C9A84C] transition-colors" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Biens immobiliers", "Réseau agents", "Suivi dossiers"].map(tag => (
              <span key={tag} className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1">{tag}</span>
            ))}
          </div>
        </button>

        {/* Courtier */}
        <button
          onClick={() => handleChoix("courtier")}
          disabled={choix !== null}
          className="w-full group bg-[#111] border border-[#222] hover:border-[#C9A84C]/50 p-6 text-left transition-all disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C9A84C]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Courtier en Financement</p>
                <p className="text-gray-500 text-sm">75% de rétrocommission sur chaque dossier</p>
              </div>
            </div>
            {choix === "courtier" ? (
              <Loader2 className="w-5 h-5 text-[#C9A84C] animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C9A84C] transition-colors" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Crédit immobilier", "Crédit pro", "Rachat de crédit", "Convention signée"].map(tag => (
              <span key={tag} className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1">{tag}</span>
            ))}
          </div>
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center max-w-sm">
        En rejoignant le réseau Sigma Factory, vous acceptez nos conditions générales de partenariat.
      </p>
    </div>
  );
}
