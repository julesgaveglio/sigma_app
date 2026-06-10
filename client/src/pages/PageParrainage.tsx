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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#C9A84C]/20 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-widest">
              SIGMA <span className="text-[#C9A84C]">FACTORY</span>
            </h1>
            <p className="text-xs text-gray-500 tracking-widest mt-0.5">CONSEIL EN IMMOBILIER &amp; FINANCEMENT</p>
          </div>
          <div className="text-right">
            <div className="text-[#C9A84C] font-bold text-sm">PROGRAMME D'AFFILIATION</div>
            <div className="text-gray-500 text-xs">Invitation personnelle</div>
          </div>
        </div>
      </header>

      {/* Bloc parrain */}
      <div className="bg-[#0d0d0d] border-b border-[#C9A84C]/20 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          {isLoading ? (
            <div className="animate-pulse text-gray-500">Chargement...</div>
          ) : parrain ? (
            <>
              <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-sm px-4 py-2 rounded-full mb-4">
                <CheckCircle size={14} />
                Invitation validée
              </div>
              <h2 className="text-3xl font-black text-white mb-2">
                {parrain.nom} vous invite à rejoindre le réseau
              </h2>
              <p className="text-gray-400 mb-4">
                {parrain.type === "agent"
                  ? "Agent Immobilier Sigma Factory"
                  : parrain.type === "courtier"
                  ? "Courtier Partenaire Sigma Factory"
                  : "Sigma Factory"}
              </p>
              <div className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-700 px-5 py-3 rounded-lg">
                <span className="text-xs text-zinc-400">Code parrain :</span>
                <span className="font-mono font-bold text-[#C9A84C] text-lg tracking-widest">{parrain.code}</span>
                <button onClick={copyLink} className="text-zinc-400 hover:text-white transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </>
          ) : code ? (
            <>
              <div className="inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm px-4 py-2 rounded-full mb-4">
                Code non reconnu
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Rejoignez le réseau Sigma Factory</h2>
              <p className="text-gray-400">Inscrivez-vous en tant qu'agent ou courtier partenaire.</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-white mb-2">Rejoignez le réseau Sigma Factory</h2>
              <p className="text-gray-400">Inscrivez-vous en tant qu'agent ou courtier partenaire.</p>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h3 className="text-4xl font-black mb-4">
            Un réseau d'affiliation <span className="text-[#C9A84C]">à 2 niveaux</span>
          </h3>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Rejoignez Sigma Factory et percevez des rétrocommissions sur chaque transaction de votre réseau.
          </p>
        </div>

        {/* Avantages — 2 colonnes agent / courtier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14 max-w-4xl mx-auto">
          {/* Agent */}
          <div className="bg-[#111] border border-[#C9A84C]/20 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-5 h-5 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Agent Immobilier</span>
            </div>
            {[
              { icon: TrendingUp, title: "50% des honoraires", desc: "Vous conservez 50% de chaque commission générée sur vos dossiers immobiliers." },
              { icon: Users, title: "10% sur vos filleuls N1", desc: "Percevez 10% de rétrocommission sur chaque vente de vos filleuls directs." },
              { icon: TrendingUp, title: "5% sur le réseau N2", desc: "Percevez 5% sur les ventes des filleuls de vos filleuls." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-[#C9A84C] mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Courtier */}
          <div className="bg-[#111] border border-[#C9A84C]/20 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Courtier Partenaire</span>
            </div>
            {[
              { icon: TrendingUp, title: "75% des honoraires", desc: "Vous conservez 75% de chaque commission générée sur vos dossiers de financement." },
              { icon: Users, title: "10% sur vos filleuls N1", desc: "Percevez 10% de rétrocommission sur chaque dossier de vos filleuls directs." },
              { icon: TrendingUp, title: "5% sur le réseau N2", desc: "Percevez 5% sur les dossiers des filleuls de vos filleuls." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-[#C9A84C] mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            onClick={goAgent}
            className="group bg-[#C9A84C] hover:bg-[#b8943e] text-black p-8 text-left transition-colors"
          >
            <Home className="w-10 h-10 mb-4" />
            <h4 className="text-xl font-black mb-2">Agent Immobilier</h4>
            <p className="text-black/70 text-sm mb-4">
              Soumettez des biens, accompagnez des clients et développez votre réseau d'agents.
            </p>
            <div className="flex items-center gap-2 font-bold text-sm">
              Rejoindre en tant qu'agent <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={goCourtier}
            className="group bg-[#111] border border-[#C9A84C]/40 hover:border-[#C9A84C] text-white p-8 text-left transition-colors"
          >
            <CreditCard className="w-10 h-10 mb-4 text-[#C9A84C]" />
            <h4 className="text-xl font-black mb-2">Courtier Partenaire</h4>
            <p className="text-gray-400 text-sm mb-4">
              Apportez des dossiers de financement et percevez vos honoraires + rétrocommissions.
            </p>
            <div className="flex items-center gap-2 font-bold text-sm text-[#C9A84C]">
              Rejoindre en tant que courtier <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Sigma info */}
        <div className="mt-14 border border-[#222] bg-[#111] p-6 flex items-start gap-4 max-w-2xl mx-auto">
          <Shield className="w-6 h-6 text-[#C9A84C] shrink-0 mt-1" />
          <div>
            <p className="text-white font-semibold text-sm">SIGMA FACTORY SAS</p>
            <p className="text-gray-400 text-sm mt-1">
              Capital 5 000 € — RCS Lyon 999 672 777 — Carte pro CPI69012026000000022 — CCI Lyon Métropole<br />
              12 Rue de la Part-Dieu, 69003 Lyon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
