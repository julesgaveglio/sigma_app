import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

type Resultat = "close" | "non_close" | "r2" | "perdu";

export default function SalesClose() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    closerNom: "",
    leadEmail: "",
    leadTelephone: "",
    offre: "" as "IDRH" | "HZC" | "SDT" | "",
    show: "" as "true" | "false" | "",
    resultat: "" as Resultat | "",
    lienFathom: "",
    formule: "" as "Starter" | "Premium" | "",
    modePaiement: "" as "une_fois" | "deux_fois" | "trois_fois" | "",
    montantGenere: "",
    montantEncaisse: "",
    hasCb: false,
    montantCb: "",
    hasVirement: false,
    montantVirement: "",
    hasCreditImpot: false,
    montantCreditImpot: "",
    hasPrelevement: false,
    montantPrelevement: "",
    datePrelevement: "",
    commentaire: "",
    dateCall: new Date().toISOString().slice(0, 16),
  });

  const soumettre = trpc.sales.soumettre.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message),
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const isShow = form.show === "true";
  const isClose = form.resultat === "close";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.closerNom || !form.offre || form.show === "") {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (isShow && !form.resultat) {
      setError("Veuillez indiquer le résultat du call.");
      return;
    }

    soumettre.mutate({
      closerNom: form.closerNom,
      leadEmail: form.leadEmail || undefined,
      leadTelephone: form.leadTelephone || undefined,
      offre: form.offre as "IDRH" | "HZC" | "SDT",
      show: form.show === "true",
      pitche: isClose,
      resultat: form.resultat as Resultat || undefined,
      lienFathom: form.lienFathom || undefined,
      formule: isClose ? (form.formule as "Starter" | "Premium" | undefined || undefined) : undefined,
      modePaiement: isClose ? (form.modePaiement as "une_fois" | "deux_fois" | "trois_fois" | undefined || undefined) : undefined,
      montantGenere: isClose ? (parseFloat(form.montantGenere) || 0) : 0,
      montantEncaisse: isClose ? (parseFloat(form.montantEncaisse) || 0) : 0,
      montantCb: isClose && form.hasCb ? parseFloat(form.montantCb) || 0 : undefined,
      montantVirement: isClose && form.hasVirement ? parseFloat(form.montantVirement) || 0 : undefined,
      montantCreditImpot: isClose && form.hasCreditImpot ? parseFloat(form.montantCreditImpot) || 0 : undefined,
      montantPrelevement: isClose && form.hasPrelevement ? parseFloat(form.montantPrelevement) || 0 : undefined,
      datePrelevement: isClose && form.hasPrelevement ? form.datePrelevement : undefined,
      commentaire: form.commentaire || undefined,
      dateCall: form.dateCall,
    });
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(f => ({
      ...f,
      leadEmail: "", leadTelephone: "", show: "", resultat: "", lienFathom: "",
      formule: "", modePaiement: "", montantGenere: "", montantEncaisse: "",
      hasCb: false, montantCb: "", hasVirement: false, montantVirement: "",
      hasCreditImpot: false, montantCreditImpot: "", hasPrelevement: false,
      montantPrelevement: "", datePrelevement: "", commentaire: "",
      dateCall: new Date().toISOString().slice(0, 16),
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Call enregistré</h2>
          <p className="text-zinc-400">Les données ont bien été transmises à la direction.</p>
          <Button onClick={resetForm} className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-semibold">
            Saisir un nouveau call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Header sticky */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[#c9a84c] text-[10px] tracking-[0.2em] uppercase font-medium">SIGMA FACTORY</p>
              <h1 className="text-base font-bold text-white">Rapport de Call</h1>
            </div>
          </div>
          <p className="text-zinc-600 text-xs">Saisie obligatoire après chaque appel</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ─── SECTION 1 : CLOSER & CALL ─── */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
                <span className="text-[#c9a84c] text-xs font-bold">1</span>
              </div>
              <h2 className="text-sm font-semibold text-white">Closer & Call</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Closer — menu déroulant fixe */}
              <div className="col-span-2">
                <Label className="text-zinc-300 text-sm mb-1.5 block">Votre prénom *</Label>
                <Select value={form.closerNom} onValueChange={v => set("closerNom", v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Sélectionnez votre prénom..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="Marie" className="text-white">Marie</SelectItem>
                    <SelectItem value="Laurent" className="text-white">Laurent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Offre */}
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Offre *</Label>
                <Select value={form.offre} onValueChange={v => set("offre", v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Offre..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {["IDRH", "HZC", "SDT"].map(o => (
                      <SelectItem key={o} value={o} className="text-white">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date + heure du call */}
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Date & heure du call *</Label>
                <Input
                  type="datetime-local"
                  value={form.dateCall}
                  onChange={e => set("dateCall", e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 2 : LEAD ─── */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
                <span className="text-[#c9a84c] text-xs font-bold">2</span>
              </div>
              <h2 className="text-sm font-semibold text-white">Lead</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  value={form.leadEmail}
                  onChange={e => set("leadEmail", e.target.value)}
                  placeholder="email@exemple.fr"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Téléphone</Label>
                <Input
                  value={form.leadTelephone}
                  onChange={e => set("leadTelephone", e.target.value)}
                  placeholder="06 XX XX XX XX"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 3 : RÉSULTAT DU CALL ─── */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
                <span className="text-[#c9a84c] text-xs font-bold">3</span>
              </div>
              <h2 className="text-sm font-semibold text-white">Résultat du call</h2>
            </div>

            {/* Show / No Show */}
            <div>
              <Label className="text-zinc-300 text-sm mb-2 block">Présence *</Label>
              <div className="grid grid-cols-2 gap-3">
                {[{ v: "true", label: "✅ Show" }, { v: "false", label: "❌ No Show" }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => { set("show", opt.v); if (opt.v === "false") set("resultat", ""); }}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.show === opt.v
                        ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Résultat détaillé — visible uniquement si Show */}
            {isShow && (
              <div>
                <Label className="text-zinc-300 text-sm mb-2 block">Résultat *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "close", label: "🏆 Closé", color: "green" },
                    { v: "non_close", label: "💬 Non closé", color: "zinc" },
                    { v: "r2", label: "🔄 R2", color: "blue" },
                    { v: "perdu", label: "❌ Perdu", color: "red" },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set("resultat", opt.v)}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                        form.resultat === opt.v
                          ? opt.color === "green" ? "border-green-500 bg-green-500/10 text-green-400"
                            : opt.color === "blue" ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : opt.color === "red" ? "border-red-500 bg-red-500/10 text-red-400"
                            : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                          : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lien Fathom */}
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">Lien Fathom</Label>
              <Input
                value={form.lienFathom}
                onChange={e => set("lienFathom", e.target.value)}
                placeholder="https://fathom.video/..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Commentaire */}
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">Commentaire</Label>
              <Textarea
                value={form.commentaire}
                onChange={e => set("commentaire", e.target.value)}
                placeholder="Objections, contexte, prochaine étape..."
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>
          </div>

          {/* ─── SECTION 4 : DÉTAIL DU CA — uniquement si Closé ─── */}
          {isShow && isClose && (
            <div className="bg-zinc-900/60 border border-[#c9a84c]/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
                  <span className="text-[#c9a84c] text-xs font-bold">4</span>
                </div>
                <h2 className="text-sm font-semibold text-[#c9a84c]">Détail du CA</h2>
                <span className="text-xs text-zinc-500 ml-auto">Remonte dans le dashboard Sales</span>
              </div>

              {/* Formule + Mode de paiement */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Formule vendue</Label>
                  <Select value={form.formule} onValueChange={v => set("formule", v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Formule..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="Starter" className="text-white">Starter</SelectItem>
                      <SelectItem value="Premium" className="text-white">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Mode de paiement</Label>
                  <Select value={form.modePaiement} onValueChange={v => set("modePaiement", v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Paiement..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="une_fois" className="text-white">1× (comptant)</SelectItem>
                      <SelectItem value="deux_fois" className="text-white">2× (échelonné)</SelectItem>
                      <SelectItem value="trois_fois" className="text-white">3× (échelonné)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Montants globaux */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Montant généré (€ TTC)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.montantGenere}
                    onChange={e => set("montantGenere", e.target.value)}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Montant encaissé (€ TTC)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.montantEncaisse}
                    onChange={e => set("montantEncaisse", e.target.value)}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Détail par mode */}
              <div className="space-y-3">
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Détail des encaissements</p>

                {/* CB Stripe */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("hasCb", !form.hasCb)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${form.hasCb ? "bg-[#c9a84c] border-[#c9a84c]" : "border-zinc-600 bg-zinc-800"}`}>
                    {form.hasCb && <span className="text-black text-xs font-bold">✓</span>}
                  </button>
                  <Label className="text-zinc-300 text-sm flex-shrink-0 w-32">CB Stripe</Label>
                  {form.hasCb && (
                    <Input type="number" min="0" step="0.01" value={form.montantCb}
                      onChange={e => set("montantCb", e.target.value)} placeholder="0.00"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm" />
                  )}
                </div>

                {/* Virement */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("hasVirement", !form.hasVirement)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${form.hasVirement ? "bg-[#c9a84c] border-[#c9a84c]" : "border-zinc-600 bg-zinc-800"}`}>
                    {form.hasVirement && <span className="text-black text-xs font-bold">✓</span>}
                  </button>
                  <Label className="text-zinc-300 text-sm flex-shrink-0 w-32">Virement</Label>
                  {form.hasVirement && (
                    <Input type="number" min="0" step="0.01" value={form.montantVirement}
                      onChange={e => set("montantVirement", e.target.value)} placeholder="0.00"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm" />
                  )}
                </div>

                {/* Crédit d'impôt */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("hasCreditImpot", !form.hasCreditImpot)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${form.hasCreditImpot ? "bg-[#c9a84c] border-[#c9a84c]" : "border-zinc-600 bg-zinc-800"}`}>
                    {form.hasCreditImpot && <span className="text-black text-xs font-bold">✓</span>}
                  </button>
                  <Label className="text-zinc-300 text-sm flex-shrink-0 w-32">Crédit d'impôt</Label>
                  {form.hasCreditImpot && (
                    <Input type="number" min="0" step="0.01" value={form.montantCreditImpot}
                      onChange={e => set("montantCreditImpot", e.target.value)} placeholder="0.00"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm" />
                  )}
                </div>

                {/* Prélèvement */}
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => set("hasPrelevement", !form.hasPrelevement)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${form.hasPrelevement ? "bg-[#c9a84c] border-[#c9a84c]" : "border-zinc-600 bg-zinc-800"}`}>
                    {form.hasPrelevement && <span className="text-black text-xs font-bold">✓</span>}
                  </button>
                  <Label className="text-zinc-300 text-sm flex-shrink-0 w-32 mt-0.5">Prélèvement</Label>
                  {form.hasPrelevement && (
                    <div className="flex gap-2 flex-1">
                      <Input type="number" min="0" step="0.01" value={form.montantPrelevement}
                        onChange={e => set("montantPrelevement", e.target.value)} placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm" />
                      <Input type="date" value={form.datePrelevement}
                        onChange={e => set("datePrelevement", e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm [color-scheme:dark]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={soumettre.isPending}
            className="w-full bg-[#c9a84c] hover:bg-[#b8963e] text-black font-semibold py-3 text-base"
          >
            {soumettre.isPending ? "Enregistrement..." : "Enregistrer le call →"}
          </Button>

        </form>
      </div>
    </div>
  );
}
