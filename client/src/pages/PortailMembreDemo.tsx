import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, FileText, TrendingUp, Copy, Home, CreditCard, Clock,
  CheckCircle, XCircle, ChevronRight, Award, Share2, BarChart2,
  Wallet, AlertCircle, UserCheck,
} from "lucide-react";

// ─── Données fictives réalistes ───────────────────────────────────────────────

const DEMO_AMBASSADEUR = {
  prenom: "Thomas",
  nom: "BERNARD",
  email: "thomas.bernard@gmail.com",
  telephone: "06 78 12 34 56",
  ville: "Lyon",
  statut: "agent_immobilier",
  statutInterne: "actif",
  codeParrain: "SIG-BERNARD-0042",
  niveau: "1",
  createdAt: "2025-11-15",
};

const DEMO_COMMISSIONS = [
  { id: 1, description: "Vente appartement T3 — Lyon 6e", montantHt: 3200, statut: "paye",    createdAt: "2026-03-12", mois: "Mars 2026" },
  { id: 2, description: "Vente maison 4 pièces — Villeurbanne", montantHt: 4800, statut: "paye",    createdAt: "2026-02-28", mois: "Février 2026" },
  { id: 3, description: "Rétrocom. filleul Dupont — Studio Lyon 3e", montantHt: 850,  statut: "valide",  createdAt: "2026-03-20", mois: "Mars 2026" },
  { id: 4, description: "Vente appartement T4 — Bron", montantHt: 5100, statut: "en_attente", createdAt: "2026-03-28", mois: "Mars 2026" },
  { id: 5, description: "Rétrocom. filleul Martin — T2 Caluire", montantHt: 620,  statut: "en_attente", createdAt: "2026-04-01", mois: "Avril 2026" },
];

const DEMO_FILLEULS = [
  { id: 1, prenom: "Claire", nom: "DUPONT",  email: "claire.dupont@gmail.com",  statut: "actif",      niveau: "1", createdAt: "2025-12-10" },
  { id: 2, prenom: "Marc",   nom: "MARTIN",  email: "marc.martin@gmail.com",    statut: "actif",      niveau: "1", createdAt: "2026-01-22" },
  { id: 3, prenom: "Julie",  nom: "LEROY",   email: "julie.leroy@gmail.com",    statut: "en_attente", niveau: "1", createdAt: "2026-03-05" },
  { id: 4, prenom: "Paul",   nom: "GIRARD",  email: "paul.girard@gmail.com",    statut: "actif",      niveau: "2", createdAt: "2026-02-14" },
];

const DEMO_BIENS = [
  { id: 1, titre: "Appartement T3 — Lyon 6e", prix: 320000, statut: "vendu",   createdAt: "2026-03-01" },
  { id: 2, titre: "Maison 4 pièces — Villeurbanne", prix: 485000, statut: "vendu",   createdAt: "2026-02-15" },
  { id: 3, titre: "Studio meublé — Lyon 3e", prix: 145000, statut: "publie",  createdAt: "2026-03-18" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statutBadge(statut: string) {
  const map: Record<string, { label: string; color: string }> = {
    en_attente: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    actif:      { label: "Actif",      color: "bg-green-500/20 text-green-400 border-green-500/30" },
    suspendu:   { label: "Suspendu",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    resilie:    { label: "Résilié",    color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[statut] ?? { label: statut, color: "bg-zinc-700 text-zinc-300" };
  return <span className={`px-2 py-0.5 rounded text-xs border ${s.color}`}>{s.label}</span>;
}

function commissionBadge(statut: string) {
  if (statut === "paye")       return <span className="text-green-400 flex items-center gap-1 text-xs"><CheckCircle size={11} /> Payée</span>;
  if (statut === "valide")     return <span className="text-blue-400 flex items-center gap-1 text-xs"><Clock size={11} /> Validée</span>;
  if (statut === "annule")     return <span className="text-red-400 flex items-center gap-1 text-xs"><XCircle size={11} /> Annulée</span>;
  return <span className="text-yellow-400 flex items-center gap-1 text-xs"><Clock size={11} /> En attente</span>;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PortailMembreDemo() {
  const [activeTab, setActiveTab] = useState<"apercu" | "commissions" | "reseau" | "dossiers">("apercu");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const totalPaye     = DEMO_COMMISSIONS.filter(c => c.statut === "paye").reduce((s, c) => s + c.montantHt, 0);
  const totalAttente  = DEMO_COMMISSIONS.filter(c => c.statut !== "paye" && c.statut !== "annule").reduce((s, c) => s + c.montantHt, 0);
  const totalGeneral  = DEMO_COMMISSIONS.filter(c => c.statut !== "annule").reduce((s, c) => s + c.montantHt, 0);

  const lienParrainage = `/parrainage/${DEMO_AMBASSADEUR.codeParrain}`;

  const copyCode = () => {
    navigator.clipboard.writeText(DEMO_AMBASSADEUR.codeParrain).catch(() => {});
    setCopiedCode(true);
    toast.success("Code copié !");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(lienParrainage).catch(() => {});
    setCopiedLink(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Historique mensuel pour le graphique
  const moisData = [
    { mois: "Nov", montant: 0 },
    { mois: "Déc", montant: 1200 },
    { mois: "Jan", montant: 2800 },
    { mois: "Fév", montant: 4800 },
    { mois: "Mar", montant: 9150 },
    { mois: "Avr", montant: 620 },
  ];
  const maxMontant = Math.max(...moisData.map(m => m.montant), 1);

  const tabs = [
    { key: "apercu",      label: "Aperçu",      icon: <Home size={14} /> },
    { key: "commissions", label: "Commissions",  icon: <Wallet size={14} /> },
    { key: "reseau",      label: "Mon Réseau",   icon: <Users size={14} /> },
    { key: "dossiers",    label: "Mes Dossiers", icon: <FileText size={14} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Bandeau démo */}
      <div className="bg-[var(--gold)]/20 border-b border-[var(--gold)]/30 px-4 py-2 text-center">
        <p className="text-[var(--gold)] text-xs font-medium">
          ✦ Aperçu démonstration — Espace Agent Sigma Factory
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header profil */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] font-bold text-xl">
              {DEMO_AMBASSADEUR.prenom[0]}{DEMO_AMBASSADEUR.nom[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{DEMO_AMBASSADEUR.prenom} {DEMO_AMBASSADEUR.nom}</h1>
                {statutBadge(DEMO_AMBASSADEUR.statutInterne)}
              </div>
              <p className="text-gray-400 text-sm mt-0.5">{DEMO_AMBASSADEUR.email}</p>
              <p className="text-gray-500 text-xs mt-0.5">Agent immobilier · {DEMO_AMBASSADEUR.ville} · Membre depuis nov. 2025</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-gray-500 text-xs mb-1">Votre code parrain</p>
            <div className="flex items-center gap-2">
              <code className="text-[var(--gold)] font-mono text-sm bg-[var(--gold)]/10 px-3 py-1 rounded border border-[var(--gold)]/30">
                {DEMO_AMBASSADEUR.codeParrain}
              </code>
              <button onClick={copyCode} className="text-gray-400 hover:text-[var(--gold)] transition-colors">
                {copiedCode ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-lg p-1 border border-[#222]">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--gold)] text-black"
                  : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Onglet Aperçu ─────────────────────────────────────────────────── */}
        {activeTab === "apercu" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total commissions", value: `${totalGeneral.toLocaleString("fr-FR")} €`, icon: <TrendingUp size={16} className="text-[var(--gold)]" />, sub: "Cumulé" },
                { label: "Payé", value: `${totalPaye.toLocaleString("fr-FR")} €`, icon: <CheckCircle size={16} className="text-green-400" />, sub: "Versé" },
                { label: "En attente", value: `${totalAttente.toLocaleString("fr-FR")} €`, icon: <Clock size={16} className="text-yellow-400" />, sub: "À venir" },
                { label: "Filleuls actifs", value: `${DEMO_FILLEULS.filter(f => f.statut === "actif").length}`, icon: <Users size={16} className="text-blue-400" />, sub: `sur ${DEMO_FILLEULS.length} total` },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">{kpi.icon}<span className="text-gray-400 text-xs">{kpi.label}</span></div>
                  <p className="text-white text-xl font-bold">{kpi.value}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Graphique mensuel */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-[var(--gold)]" />
                <h3 className="text-white font-semibold text-sm">Évolution mensuelle des commissions</h3>
              </div>
              <div className="flex items-end gap-2 h-32">
                {moisData.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "96px" }}>
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max((m.montant / maxMontant) * 96, m.montant > 0 ? 4 : 0)}px`,
                          background: m.mois === "Mar" ? "var(--gold)" : "var(--gold)33",
                        }}
                      />
                    </div>
                    <span className="text-gray-500 text-xs">{m.mois}</span>
                    {m.montant > 0 && <span className="text-gray-400 text-xs">{(m.montant / 1000).toFixed(1)}k</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Lien parrainage */}
            <div className="bg-[var(--gold)]/8 border border-[var(--gold)]/25 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={16} className="text-[var(--gold)]" />
                <h3 className="text-white font-semibold text-sm">Votre lien d'invitation</h3>
              </div>
              <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 mb-3">
                <code className="text-gray-300 text-xs flex-1 truncate">{lienParrainage}</code>
                <button onClick={copyLink} className="text-gray-400 hover:text-[var(--gold)] transition-colors flex-shrink-0">
                  {copiedLink ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-gray-500 text-xs">Partagez ce lien — votre code sera automatiquement pré-rempli dans le formulaire d'inscription.</p>
            </div>
          </div>
        )}

        {/* ── Onglet Commissions ────────────────────────────────────────────── */}
        {activeTab === "commissions" && (
          <div className="space-y-4">
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total généré",  value: `${totalGeneral.toLocaleString("fr-FR")} €`, color: "text-white" },
                { label: "Payé",          value: `${totalPaye.toLocaleString("fr-FR")} €`,    color: "text-green-400" },
                { label: "En attente",    value: `${totalAttente.toLocaleString("fr-FR")} €`, color: "text-yellow-400" },
              ].map((s, i) => (
                <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Liste */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222]">
                <h3 className="text-white font-semibold text-sm">Historique des commissions</h3>
              </div>
              {DEMO_COMMISSIONS.map((c, i) => (
                <div key={c.id} className={`flex items-center justify-between px-4 py-3 ${i < DEMO_COMMISSIONS.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{c.description}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{c.mois}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    {commissionBadge(c.statut)}
                    <span className={`font-semibold text-sm ${c.statut === "paye" ? "text-green-400" : c.statut === "annule" ? "text-red-400/50 line-through" : "text-yellow-400"}`}>
                      {c.montantHt.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Onglet Réseau ─────────────────────────────────────────────────── */}
        {activeTab === "reseau" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Filleuls N1", value: DEMO_FILLEULS.filter(f => f.niveau === "1").length, color: "text-[var(--gold)]" },
                { label: "Filleuls N2", value: DEMO_FILLEULS.filter(f => f.niveau === "2").length, color: "text-blue-400" },
              ].map((s, i) => (
                <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222]">
                <h3 className="text-white font-semibold text-sm">Mes filleuls</h3>
              </div>
              {DEMO_FILLEULS.map((f, i) => (
                <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${i < DEMO_FILLEULS.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-xs font-bold flex-shrink-0">
                    {f.prenom[0]}{f.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{f.prenom} {f.nom}</p>
                    <p className="text-gray-500 text-xs truncate">{f.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">N{f.niveau}</span>
                    {statutBadge(f.statut)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Onglet Dossiers ───────────────────────────────────────────────── */}
        {activeTab === "dossiers" && (
          <div className="space-y-4">
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222]">
                <h3 className="text-white font-semibold text-sm">Mes biens soumis</h3>
              </div>
              {DEMO_BIENS.map((b, i) => (
                <div key={b.id} className={`flex items-center justify-between px-4 py-3 ${i < DEMO_BIENS.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Home size={16} className="text-[var(--gold)] flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm">{b.titre}</p>
                      <p className="text-gray-500 text-xs">{b.prix.toLocaleString("fr-FR")} €</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${b.statut === "vendu" ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"}`}>
                    {b.statut === "vendu" ? "Vendu" : "En ligne"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
