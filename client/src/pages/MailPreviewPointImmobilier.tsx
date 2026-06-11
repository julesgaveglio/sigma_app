import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Mail, Send, Eye, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function MailPreviewPointImmobilier() {
  const { user, loading } = useAuth();
  const [testEmail, setTestEmail] = useState("");
  const [testNom, setTestNom] = useState("Jean Dupont");

  const sendTestMutation = trpc.crm.sendPointImmobilierEmailTest.useMutation({
    onSuccess: (data) => toast.success(`Email de test envoye a ${data.email}`),
    onError: (err) => toast.error(err.message),
  });

  if (loading) return null;
  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const rdvUrl = "https://www.sigmafactory.org/rdv/point-immobilier";
  const nomLead = testNom || "Jean Dupont";

  const mailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#111">
  <div style="background:#000;padding:28px 36px;border-bottom:2px solid var(--gold)">
    <div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:var(--gold)">FACTORY</span></div>
    <div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pole Immobilier</div>
  </div>
  <div style="padding:36px">
    <h2 style="margin:0 0 6px;color:#fff">Felicitations, votre financement est valide !</h2>
    <p style="color:var(--gold);font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Prochaine etape — Recherche de bien</p>
    <p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px">
      Bonjour ${nomLead},<br><br>
      Votre enveloppe de financement a ete validee. Vous passez maintenant a l'etape <strong style="color:#fff">Recherche de Bien</strong> avec <strong style="color:var(--gold)">Elodie</strong>, votre conseillere immobiliere dediee chez Sigma Factory.<br><br>
      Elodie va vous accompagner dans la recherche du bien ideal correspondant a votre projet et a votre budget.
    </p>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:20px 0">
      <div style="color:var(--gold);font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre prochaine etape</div>
      <div style="color:#fff;font-size:15px;font-weight:bold">Point Immobilier avec Elodie</div>
      <div style="color:#aaa;font-size:13px;margin-top:6px">Premier echange pour lancer votre recherche de bien — 45 min</div>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${rdvUrl}" style="background:var(--gold);color:#000;text-decoration:none;padding:14px 32px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRENDRE MON RENDEZ-VOUS</a>
    </div>
    <p style="color:#555;font-size:12px;line-height:1.6">En cas de question : <a href="mailto:elodie@sigmafactory.fr" style="color:var(--gold)">elodie@sigmafactory.fr</a></p>
  </div>
  <div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center">Sigma Factory — Pole Immobilier</div>
</div>
</body>
</html>`;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "16px 24px" }}>
        <div className="flex items-center justify-between" style={{ maxWidth: "1024px", margin: "0 auto" }}>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/recherche-bien">
              <button className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70" style={{ background: "none", border: "none", color: "var(--foreground-muted)", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                Retour
              </button>
            </Link>
            <div>
              <p className="label-uppercase" style={{ marginBottom: "4px" }}>Sigma Factory</p>
              <h1 className="flex items-center gap-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }}>
                <Eye className="w-4 h-4" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
                Apercu — Mail Point Immobilier
              </h1>
            </div>
          </div>
          <a href="/rdv/point-immobilier" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70"
            style={{ color: "var(--foreground-muted)", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: "none", letterSpacing: "0.04em" }}>
            <ExternalLink className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            Voir la page RDV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-8" style={{ maxWidth: "1024px", margin: "0 auto" }}>
        {/* Panneau gauche */}
        <div className="space-y-5">
          {/* Info */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
            <h2 className="flex items-center gap-2 label-uppercase mb-4">
              <Mail className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Informations
            </h2>
            <div className="space-y-3">
              {[
                { label: "Expediteur", value: "Sigma Factory" },
                { label: "De", value: "noreply@fa.sigma-factory.fr" },
                { label: "Objet", value: "Votre financement est valide — Prenez votre Point Immobilier avec Elodie" },
                { label: "Declencheur", value: 'Lead passe a l\'etape "Recherche de Bien"' },
              ].map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{item.label} :</span>
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", marginLeft: "8px" }}>{item.value}</span>
                </div>
              ))}
              <div>
                <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Lien RDV :</span>
                <a href={rdvUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--gold)", marginLeft: "8px", textDecoration: "none" }}>/rdv/point-immobilier</a>
              </div>
            </div>
          </div>

          {/* Test d'envoi */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
            <h2 className="flex items-center gap-2 label-uppercase mb-4">
              <Send className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Test d'envoi
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label-uppercase block mb-2">Nom du destinataire</label>
                <input
                  value={testNom}
                  onChange={(e) => setTestNom(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--foreground)", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="label-uppercase block mb-2">Email de test</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--foreground)", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <button
                onClick={() => {
                  if (!testEmail) { toast.error("Entrez un email de test"); return; }
                  sendTestMutation.mutate({ email: testEmail, nom: testNom || "Jean Dupont" });
                }}
                disabled={sendTestMutation.isPending || !testEmail}
                className="w-full flex items-center justify-center gap-2 transition-opacity duration-300"
                style={{
                  background: (sendTestMutation.isPending || !testEmail) ? "var(--gold-muted)" : "var(--gold)",
                  color: "var(--background)",
                  border: "none",
                  borderRadius: "2px",
                  padding: "12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  cursor: (sendTestMutation.isPending || !testEmail) ? "not-allowed" : "pointer",
                  opacity: (sendTestMutation.isPending || !testEmail) ? 0.7 : 1,
                }}
              >
                <Send className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                {sendTestMutation.isPending ? "Envoi en cours..." : "Envoyer un email de test"}
              </button>
              <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", textAlign: "center" }}>L'email sera envoye avec le nom saisi ci-dessus</p>
            </div>
          </div>
        </div>

        {/* Apercu du mail */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "12px 16px" }}>
            <span className="label-uppercase">Apercu du mail</span>
            <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Rendu HTML reel</span>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            <iframe
              srcDoc={mailHtml}
              title="Apercu mail Point Immobilier"
              className="w-full"
              style={{ height: "600px", border: "none", background: "var(--surface)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
