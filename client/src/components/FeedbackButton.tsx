import { useState } from "react";
import { MessageSquarePlus, X, Send, Bug, Lightbulb, HelpCircle, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "bug", label: "Bug / Erreur", icon: Bug, color: "text-red-400" },
  { value: "amelioration", label: "Amélioration", icon: Lightbulb, color: "text-yellow-400" },
  { value: "question", label: "Question", icon: HelpCircle, color: "text-blue-400" },
  { value: "autre", label: "Autre", icon: FileText, color: "text-gray-400" },
] as const;

const PRIORITE_OPTIONS = [
  { value: "faible", label: "Faible" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "critique", label: "Critique 🚨" },
] as const;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "bug" as "bug" | "amelioration" | "question" | "autre",
    priorite: "normale" as "faible" | "normale" | "haute" | "critique",
    titre: "",
    description: "",
    auteur: "",
    email: "",
  });
  const soumettre = trpc.feedbacks.soumettre.useMutation({
    onSuccess: () => {
      toast.success("Signalement envoyé !", { description: "Merci ! L'équipe a été notifiée et prendra en charge votre retour." });
      setOpen(false);
      setForm({ type: "bug", priorite: "normale", titre: "", description: "", auteur: "", email: "" });
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.description.trim()) {
      toast.error("Titre et description sont obligatoires.");
      return;
    }
    soumettre.mutate({
      ...form,
      page: window.location.pathname,
      email: form.email || undefined,
    });
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#0A0A0A" }}
        title="Signaler un problème ou faire une suggestion"
      >
        <MessageSquarePlus size={18} />
        <span className="text-sm font-semibold hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "#111111", border: "1px solid #2A2A2A" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={18} style={{ color: "#C9A84C" }} />
                <span className="font-semibold text-white">Signaler / Suggérer</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: form.type === opt.value ? "#1A1A1A" : "transparent",
                          border: `1px solid ${form.type === opt.value ? "#C9A84C" : "#2A2A2A"}`,
                          color: form.type === opt.value ? "#C9A84C" : "#888",
                        }}
                      >
                        <Icon size={14} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priorité */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Priorité</label>
                <div className="flex gap-2">
                  {PRIORITE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priorite: opt.value }))}
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: form.priorite === opt.value ? "#1A1A1A" : "transparent",
                        border: `1px solid ${form.priorite === opt.value ? "#C9A84C" : "#2A2A2A"}`,
                        color: form.priorite === opt.value ? "#C9A84C" : "#666",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Titre *</label>
                <input
                  type="text"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="Résumé en quelques mots..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:ring-1"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                  maxLength={255}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez le problème ou la suggestion en détail..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none resize-none"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                />
              </div>

              {/* Auteur + Email (optionnels) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Votre nom</label>
                  <input
                    type="text"
                    value={form.auteur}
                    onChange={e => setForm(f => ({ ...f, auteur: e.target.value }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                  />
                </div>
              </div>

              {/* Page (auto) */}
              <p className="text-xs text-gray-600">Page actuelle : <span className="text-gray-500">{window.location.pathname}</span></p>

              {/* Submit */}
              <button
                type="submit"
                disabled={soumettre.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#0A0A0A" }}
              >
                <Send size={15} />
                {soumettre.isPending ? "Envoi en cours..." : "Envoyer le signalement"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
