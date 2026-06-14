import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const e = params.get("email");
    if (!t) {
      setInvalidToken(true);
    } else {
      setToken(t);
      if (e) setEmail(e);
    }
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Erreur lors de la réinitialisation.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirm) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    resetMutation.mutate({ email, token, newPassword: password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5"
         style={{ background: "var(--background)" }}>
      <div className="w-full" style={{ maxWidth: "380px" }}>

        {/* ── Wordmark ── */}
        <header className="text-center mb-16">
          <h1 className="text-[var(--gold)] mb-3"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                lineHeight: 1,
              }}>
            SIGMA FACTORY
          </h1>
          <div className="gold-rule mx-auto" style={{ width: "40px" }} />
        </header>

        {/* ── Card ── */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "40px 36px",
        }}>
          {invalidToken ? (
            <div style={{ textAlign: "center" }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}>
                Lien invalide
              </h2>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                lineHeight: "1.6",
                margin: "0 0 28px",
              }}>
                Ce lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.
              </p>
              <a
                href="/login"
                className="transition-opacity duration-300 ease-out hover:opacity-80"
                style={{
                  display: "inline-block",
                  background: "var(--gold)",
                  color: "var(--background)",
                  textDecoration: "none",
                  borderRadius: "2px",
                  padding: "14px 28px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                }}
              >
                Retour a la connexion
              </a>
            </div>
          ) : success ? (
            <div style={{ textAlign: "center" }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}>
                Mot de passe modifie
              </h2>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                lineHeight: "1.6",
                margin: "0 0 8px",
              }}>
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                lineHeight: "1.6",
                margin: "0 0 28px",
              }}>
                Vous pouvez maintenant vous connecter.
              </p>
              <a
                href="/login"
                className="transition-opacity duration-300 ease-out hover:opacity-80"
                style={{
                  display: "inline-block",
                  background: "var(--gold)",
                  color: "var(--background)",
                  textDecoration: "none",
                  borderRadius: "2px",
                  padding: "14px 28px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                }}
              >
                Se connecter
              </a>
            </div>
          ) : (
            <>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "8px",
                textAlign: "center",
              }}>
                Nouveau mot de passe
              </h2>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                textAlign: "center",
                margin: "0 0 32px",
                lineHeight: "1.6",
              }}>
                Choisissez un mot de passe securise (8 caracteres minimum)
              </p>

              {error && (
                <div style={{
                  background: "var(--surface-header)",
                  border: "1px solid #3A1E1E",
                  borderRadius: "2px",
                  padding: "12px 16px",
                  marginBottom: "24px",
                  color: "var(--destructive)",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="label-uppercase block mb-2">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    autoComplete="email"
                    className="w-full transition-colors duration-300 ease-out focus:outline-none"
                    style={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      padding: "12px 14px",
                      color: "var(--foreground)",
                      fontSize: "14px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                <div className="mb-5">
                  <label className="label-uppercase block mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    className="w-full transition-colors duration-300 ease-out focus:outline-none"
                    style={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      padding: "12px 14px",
                      color: "var(--foreground)",
                      fontSize: "14px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                <div className="mb-8">
                  <label className="label-uppercase block mb-2">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full transition-colors duration-300 ease-out focus:outline-none"
                    style={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      padding: "12px 14px",
                      color: "var(--foreground)",
                      fontSize: "14px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="w-full transition-opacity duration-300 ease-out"
                  style={{
                    background: resetMutation.isPending ? "var(--gold-muted)" : "var(--gold)",
                    color: "var(--background)",
                    border: "none",
                    borderRadius: "2px",
                    padding: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: resetMutation.isPending ? "not-allowed" : "pointer",
                    opacity: resetMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {resetMutation.isPending ? "Reinitialisation..." : "Reinitialiser le mot de passe"}
                </button>
              </form>

              <div style={{
                borderTop: "1px solid var(--border)",
                marginTop: "28px",
                paddingTop: "24px",
                textAlign: "center",
              }}>
                <a
                  href="/login"
                  className="transition-opacity duration-300 ease-out hover:opacity-70"
                  style={{
                    color: "var(--foreground-muted)",
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  Retour a la connexion
                </a>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <p className="text-center mt-10" style={{
          color: "var(--border)",
          fontSize: "10px",
          fontFamily: "'Hanken Grotesk', sans-serif",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}>
          Application interne confidentielle
        </p>
      </div>
    </div>
  );
}
