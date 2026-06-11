import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, TrendingUp, CheckCircle, Clock, Plus, Users, Star, FileText, ArrowLeft } from "lucide-react";
import AdminNav from "@/components/AdminNav";

const STATUT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  a_payer: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  facture_recue: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  paye: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
};

const STATUT_LABELS: Record<string, string> = {
  a_payer: "A payer", facture_recue: "Facture recue", paye: "Payee",
};

const NIVEAU_LABELS: Record<string, string> = {
  "0": "Direct", "1": "N1 — 10%", "2": "N2 — 5%",
};

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_COLORS[statut] ?? { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

function NiveauBadge({ niveau }: { niveau: string }) {
  const styles: Record<string, { color: string; bg: string; border: string }> = {
    "0": { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
    "1": { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
    "2": { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  };
  const s = styles[niveau] ?? styles["0"];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {NIVEAU_LABELS[niveau] ?? niveau}
    </span>
  );
}

export default function CommissionsDashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("all");
  const [form, setForm] = useState({
    ambassadeurId: "",
    commissionSigmaHt: "",
    descriptionVente: "",
    dateEncaissement: new Date().toISOString().split("T")[0],
    reference: "",
  });

  const { data: commissions } = trpc.ambassadeurs.listCommissions.useQuery(
    filtreStatut !== "all" ? { statut: filtreStatut } : undefined
  );
  const { data: statsData } = trpc.ambassadeurs.stats.useQuery();
  const { data: ambassadeursList } = trpc.ambassadeurs.list.useQuery({ statut: "actif" });

  const utils = trpc.useUtils();

  const creerCommission = trpc.ambassadeurs.creerCommission.useMutation({
    onSuccess: () => {
      setShowAddDialog(false);
      setForm({ ambassadeurId: "", commissionSigmaHt: "", descriptionVente: "", dateEncaissement: new Date().toISOString().split("T")[0], reference: "" });
      utils.ambassadeurs.listCommissions.invalidate();
      utils.ambassadeurs.stats.invalidate();
    },
  });

  const validerCommission = trpc.ambassadeurs.validerCommission.useMutation({
    onSuccess: () => utils.ambassadeurs.listCommissions.invalidate(),
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const commSigma = parseFloat(form.commissionSigmaHt) || 0;
  const commN1 = commSigma * 0.10;
  const commN2 = commSigma * 0.05;

  // Stats calculées depuis la liste
  const totalAPayer = commissions?.filter((c: any) => c.statut === "a_payer").reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0) ?? 0;
  const totalPaye = commissions?.filter((c: any) => c.statut === "paye").reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0) ?? 0;
  const totalCommissions = commissions?.length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-between px-5 py-2.5" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="flex items-center gap-3">
            <a href="/dashboard/reseau"
              className="p-2 transition-colors duration-300"
              style={{ color: "#3A3632", border: "1px solid #1E1E1E", borderRadius: "2px", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#6B6560"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#3A3632"; }}
            >
              <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </a>
            <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#3A3632", letterSpacing: "0.04em" }}>Reseau</span>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 transition-colors duration-300"
            style={{
              padding: "8px 20px",
              background: "#C9A84C",
              color: "#0A0A0A",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              borderRadius: "2px",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#d4b45a")}
            onMouseLeave={e => (e.currentTarget.style.background = "#C9A84C")}
          >
            <Plus className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Enregistrer une vente
          </button>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Title */}
        <div className="mb-10">
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            lineHeight: 1,
          }}>
            Commissions Agents
          </h1>
          <p style={{
            fontSize: "13px",
            fontFamily: "'Hanken Grotesk', sans-serif",
            color: "#3A3632",
            marginTop: "8px",
          }}>
            Suivi des retrocommissions N1 (10%) et N2 (5%)
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          {[
            { label: "Total verse", value: `${totalPaye.toLocaleString("fr-FR")} EUR`, highlight: false },
            { label: "En attente", value: `${totalAPayer.toLocaleString("fr-FR")} EUR`, highlight: true },
            { label: "Lignes de commission", value: String(totalCommissions), highlight: false },
            { label: "Agents actifs", value: String(statsData?.actifs ?? 0), highlight: false },
          ].map((s, i) => (
            <div key={s.label} className="p-5" style={{ background: "#0A0A0A" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: s.highlight ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {s.value}
              </p>
              <p className="label-uppercase mt-2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtre */}
        <div className="flex items-center gap-3 mb-5">
          {["all", "a_payer", "facture_recue", "paye"].map(key => (
            <button
              key={key}
              onClick={() => setFiltreStatut(key)}
              className="transition-colors duration-300"
              style={{
                padding: "6px 14px",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                border: `1px solid ${filtreStatut === key ? "#C9A84C" : "#1E1E1E"}`,
                background: filtreStatut === key ? "rgba(201,168,76,0.08)" : "transparent",
                color: filtreStatut === key ? "#C9A84C" : "#3A3632",
                cursor: "pointer",
              }}
            >
              {key === "all" ? "Toutes" : STATUT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
          {!commissions?.length ? (
            <div className="text-center py-20">
              <Euro className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucune commission enregistree</p>
              <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>Enregistrez une vente pour generer les retrocommissions automatiquement</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                    {["Agent", "Description", "Comm. Sigma HT", "Montant HT", "Niveau", "Statut", ""].map(h => (
                      <th key={h} className={`px-5 py-3 label-uppercase ${h === "Comm. Sigma HT" || h === "Montant HT" ? "text-right" : h === "Niveau" ? "text-center" : "text-left"}`} style={{ background: "#0D0D0D" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm: any) => (
                    <tr key={comm.id}
                      className="transition-colors duration-300"
                      style={{ borderBottom: "1px solid #151515" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3">
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>Amb. #{comm.ambassadeurId}</p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{comm.reference}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{comm.descriptionVente ?? "—"}</p>
                        <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{comm.dateEncaissement}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560" }}>{comm.commissionSigmaHt?.toLocaleString("fr-FR")} EUR</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="tabular-nums" style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: "20px",
                          fontWeight: 600,
                          color: "#F0EDE6",
                          lineHeight: 1,
                        }}>
                          {comm.montantHt?.toLocaleString("fr-FR")} EUR
                        </p>
                        <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>{comm.tauxPourcent}%</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <NiveauBadge niveau={comm.niveau} />
                      </td>
                      <td className="px-5 py-3">
                        <StatutBadge statut={comm.statut} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {comm.statut !== "paye" && (
                          <button
                            onClick={() => validerCommission.mutate({ id: comm.id })}
                            className="transition-colors duration-300"
                            style={{
                              padding: "4px 12px",
                              fontSize: "10px",
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontWeight: 500,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase" as const,
                              color: "#4A7A5A",
                              border: "1px solid rgba(74,122,90,0.3)",
                              borderRadius: "2px",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,122,90,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            Marquer payee
                          </button>
                        )}
                        {comm.statut === "paye" && comm.valideParNom && (
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Valide par {comm.valideParNom}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog ajouter vente */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", maxWidth: "520px", padding: 0 }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              color: "#F0EDE6",
              letterSpacing: "0.02em",
            }}>
              Enregistrer une vente
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Agent */}
            <div>
              <p className="label-uppercase mb-2">Agent</p>
              <Select value={form.ambassadeurId} onValueChange={v => set("ambassadeurId", v)}>
                <SelectTrigger style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", color: "#F0EDE6", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  <SelectValue placeholder="Selectionner un agent" />
                </SelectTrigger>
                <SelectContent style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                  {ambassadeursList?.map((amb: any) => (
                    <SelectItem key={amb.id} value={String(amb.id)} style={{ color: "#F0EDE6", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      {amb.prenom} {amb.nom} — N{amb.niveau}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commission + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label-uppercase mb-2">Commission Sigma HT (EUR)</p>
                <input
                  type="number"
                  value={form.commissionSigmaHt}
                  onChange={e => set("commissionSigmaHt", e.target.value)}
                  placeholder="8750"
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <p className="label-uppercase mb-2">Date d'encaissement</p>
                <input
                  type="date"
                  value={form.dateEncaissement}
                  onChange={e => set("dateEncaissement", e.target.value)}
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
            </div>

            {/* Calcul automatique */}
            {commSigma > 0 && (
              <div style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px" }}>
                <p className="label-uppercase mb-3">Retrocommissions calculees</p>
                <div className="grid grid-cols-2 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px" }}>
                  <div className="p-4" style={{ background: "#0A0A0A" }}>
                    <p className="tabular-nums" style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#C9A84C",
                      lineHeight: 1,
                    }}>
                      {commN1.toLocaleString("fr-FR")} EUR
                    </p>
                    <p className="label-uppercase mt-1.5" style={{ fontSize: "10px" }}>Agent N1 (10%)</p>
                  </div>
                  <div className="p-4" style={{ background: "#0A0A0A" }}>
                    <p className="tabular-nums" style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#F0EDE6",
                      lineHeight: 1,
                    }}>
                      {commN2.toLocaleString("fr-FR")} EUR
                    </p>
                    <p className="label-uppercase mt-1.5" style={{ fontSize: "10px" }}>Parrain N2 (5%)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="label-uppercase mb-2">Description de la vente</p>
              <input
                value={form.descriptionVente}
                onChange={e => set("descriptionVente", e.target.value)}
                placeholder="Appartement T3 Lyon 3eme — Vente directe"
                className="w-full transition-colors duration-300 focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>

            {/* Reference */}
            <div>
              <p className="label-uppercase mb-2">Reference interne</p>
              <input
                value={form.reference}
                onChange={e => set("reference", e.target.value)}
                placeholder="VENTE-2026-001"
                className="w-full transition-colors duration-300 focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>

            {/* Error */}
            {creerCommission.isError && (
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#A04040" }}>{creerCommission.error.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: "1px solid #1E1E1E" }}>
            <button
              onClick={() => setShowAddDialog(false)}
              className="transition-colors duration-300"
              style={{
                padding: "10px 20px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "#6B6560",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
            >
              Annuler
            </button>
            <button
              disabled={!form.ambassadeurId || !form.commissionSigmaHt || !form.dateEncaissement || creerCommission.isPending}
              onClick={() => creerCommission.mutate({
                ambassadeurId: parseInt(form.ambassadeurId),
                commissionSigmaHt: parseFloat(form.commissionSigmaHt),
                dateEncaissement: form.dateEncaissement,
                descriptionVente: form.descriptionVente || undefined,
                reference: form.reference || undefined,
              })}
              className="flex-1 transition-colors duration-300"
              style={{
                padding: "10px 20px",
                background: (!form.ambassadeurId || !form.commissionSigmaHt || !form.dateEncaissement || creerCommission.isPending) ? "#8A7535" : "#C9A84C",
                color: "#0A0A0A",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: "none",
                cursor: (!form.ambassadeurId || !form.commissionSigmaHt || !form.dateEncaissement || creerCommission.isPending) ? "not-allowed" : "pointer",
              }}
            >
              {creerCommission.isPending ? "Enregistrement..." : "Enregistrer et calculer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
