import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Send, Eye, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function MailPreviewPointImmobilier() {
  const { user, loading } = useAuth();
  const [testEmail, setTestEmail] = useState("");
  const [testNom, setTestNom] = useState("Jean Dupont");

  const sendTestMutation = trpc.crm.sendPointImmobilierEmailTest.useMutation({
    onSuccess: (data) => toast.success(`Email de test envoyé à ${data.email} ✓`),
    onError: (err) => toast.error(err.message),
  });

  if (loading) return null;
  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  // HTML du mail (identique à mailer.ts)
  const rdvUrl = "https://www.sigmafactory.org/rdv/point-immobilier";
  const nomLead = testNom || "Jean Dupont";

  const mailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#111">
  <div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C">
    <div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div>
    <div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pole Immobilier</div>
  </div>
  <div style="padding:36px">
    <h2 style="margin:0 0 6px;color:#fff">Félicitations, votre financement est validé !</h2>
    <p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Prochaine étape — Recherche de bien</p>
    <p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px">
      Bonjour ${nomLead},<br><br>
      Votre enveloppe de financement a été validée. Vous passez maintenant à l'étape <strong style="color:#fff">Recherche de Bien</strong> avec <strong style="color:#C9A84C">Élodie</strong>, votre conseillère immobilière dédiée chez Sigma Factory.<br><br>
      Élodie va vous accompagner dans la recherche du bien idéal correspondant à votre projet et à votre budget.
    </p>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:20px 0">
      <div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre prochaine étape</div>
      <div style="color:#fff;font-size:15px;font-weight:bold">Point Immobilier avec Élodie</div>
      <div style="color:#aaa;font-size:13px;margin-top:6px">Premier échange pour lancer votre recherche de bien — 45 min</div>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${rdvUrl}" style="background:#C9A84C;color:#000;text-decoration:none;padding:14px 32px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRENDRE MON RENDEZ-VOUS</a>
    </div>
    <p style="color:#555;font-size:12px;line-height:1.6">En cas de question : <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p>
  </div>
  <div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center">Sigma Factory — Pôle Immobilier</div>
</div>
</body>
</html>`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-black border-b border-[#C9A84C]/20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/recherche-bien">
              <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </Link>
            <div>
              <div className="text-xs font-bold tracking-[4px] text-[#C9A84C] uppercase mb-0.5">Sigma Factory</div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#C9A84C]" />
                Aperçu — Mail Point Immobilier
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/rdv/point-immobilier"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir la page RDV
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panneau gauche — Test d'envoi */}
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-[#111] border border-[#C9A84C]/20 p-5">
            <h2 className="text-sm font-bold text-[#C9A84C] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Informations
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Expéditeur :</span>
                <span className="text-white ml-2">Sigma Factory</span>
              </div>
              <div>
                <span className="text-gray-500">De :</span>
                <span className="text-white ml-2 font-mono text-xs">noreply@fa.sigma-factory.fr</span>
              </div>
              <div>
                <span className="text-gray-500">Objet :</span>
                <span className="text-white ml-2 text-xs">Votre financement est validé — Prenez votre Point Immobilier avec Élodie</span>
              </div>
              <div>
                <span className="text-gray-500">Déclencheur :</span>
                <span className="text-white ml-2 text-xs">Lead passe à l'étape "Recherche de Bien" dans le Pipeline</span>
              </div>
              <div>
                <span className="text-gray-500">Lien RDV :</span>
                <a href={rdvUrl} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] ml-2 text-xs hover:underline">/rdv/point-immobilier</a>
              </div>
            </div>
          </div>

          {/* Test d'envoi */}
          <div className="bg-[#111] border border-[#C9A84C]/20 p-5">
            <h2 className="text-sm font-bold text-[#C9A84C] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Test d'envoi
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nom du destinataire</label>
                <Input
                  value={testNom}
                  onChange={(e) => setTestNom(e.target.value)}
                  placeholder="Jean Dupont"
                  className="bg-[#0a0a0a] border-gray-700 text-white text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email de test *</label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="bg-[#0a0a0a] border-gray-700 text-white text-sm h-9"
                />
              </div>
              <Button
                onClick={() => {
                  if (!testEmail) { toast.error("Entrez un email de test"); return; }
                  sendTestMutation.mutate({ email: testEmail, nom: testNom || "Jean Dupont" });
                }}
                disabled={sendTestMutation.isPending || !testEmail}
                className="w-full bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold text-sm h-9 gap-2"
              >
                <Send className="w-4 h-4" />
                {sendTestMutation.isPending ? "Envoi en cours..." : "Envoyer un email de test"}
              </Button>
              <p className="text-xs text-gray-600 text-center">L'email sera envoyé avec le nom saisi ci-dessus</p>
            </div>
          </div>
        </div>

        {/* Aperçu du mail */}
        <div className="lg:col-span-2">
          <div className="bg-[#111] border border-gray-800 p-4 mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Aperçu du mail</span>
            <span className="text-xs text-gray-600">Rendu HTML réel</span>
          </div>
          <div className="border border-gray-800 overflow-hidden">
            <iframe
              srcDoc={mailHtml}
              title="Aperçu mail Point Immobilier"
              className="w-full"
              style={{ height: "600px", border: "none", background: "#111" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
