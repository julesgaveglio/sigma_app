import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(() => new URLSearchParams(window.location.search).get("forgot") === "1");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      const userEmail = data?.user?.email ?? "";
      const userRole = data?.user?.role ?? "user";
      if (userRole === "admin") {
        navigate("/dashboard");
      } else if (userRole === "direction") {
        if (userEmail === "assistance.direction@sigmaipf.fr") {
          navigate("/dashboard/hexa");
        } else if (userEmail === "manondubost@sigmaipf.fr") {
          navigate("/dashboard/courtiers");
        } else if (userEmail === "elodie@sigmafactory.fr") {
          navigate("/dashboard/reseau");
        } else if (userEmail === "maria@sigmaipf.fr") {
          navigate("/dashboard/pipeline");
        } else {
          navigate("/dashboard");
        }
      } else if (userRole === "agent") {
        navigate("/dashboard/portail");
      } else if (userRole === "courtier") {
        navigate("/dashboard/courtier");
      } else {
        navigate("/dashboard/portail");
      }
    },
    onError: (err) => {
      setError(err.message || "Email ou mot de passe incorrect.");
    },
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setForgotSent(true);
      setForgotError("");
    },
    onError: (err) => {
      setForgotError(err.message || "Erreur lors de l'envoi.");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) {
      setForgotError("Veuillez entrer votre adresse email.");
      return;
    }
    resetMutation.mutate({ email: forgotEmail });
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
          {!showForgot ? (
            <>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "32px",
                textAlign: "center",
              }}>
                Connexion
              </h2>

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

              <form onSubmit={handleLogin}>
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

                <div className="mb-8">
                  <label className="label-uppercase block mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
                  disabled={loginMutation.isPending}
                  className="w-full transition-opacity duration-300 ease-out"
                  style={{
                    background: loginMutation.isPending ? "var(--gold-muted)" : "var(--gold)",
                    color: "var(--background)",
                    border: "none",
                    borderRadius: "2px",
                    padding: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                    opacity: loginMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {loginMutation.isPending ? "Connexion..." : "Se connecter"}
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  onClick={() => { setShowForgot(true); setError(""); }}
                  className="transition-opacity duration-300 ease-out hover:opacity-70"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--foreground-muted)",
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.02em",
                    padding: 0,
                  }}
                >
                  Mot de passe oublie
                </button>
              </div>

              <div style={{
                borderTop: "1px solid var(--border)",
                marginTop: "28px",
                paddingTop: "24px",
                textAlign: "center",
              }}>
                <p style={{
                  color: "var(--foreground-faint)",
                  fontSize: "12px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  margin: "0 0 8px",
                }}>
                  Pas encore de compte
                </p>
                <a
                  href="/register"
                  className="transition-opacity duration-300 ease-out hover:opacity-70"
                  style={{
                    color: "var(--foreground-muted)",
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  Creer mon compte
                </a>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(""); }}
                className="transition-opacity duration-300 ease-out hover:opacity-70"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--foreground-muted)",
                  fontSize: "12px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  padding: "0 0 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  letterSpacing: "0.04em",
                }}
              >
                ← Retour
              </button>

              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                Mot de passe oublie
              </h2>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                margin: "0 0 28px",
                lineHeight: "1.6",
              }}>
                Entrez votre adresse email. Un mot de passe temporaire vous sera envoye directement.
              </p>

              {forgotSent ? (
                <div style={{
                  background: "var(--surface-header)",
                  border: "1px solid #1A3A22",
                  borderRadius: "2px",
                  padding: "16px",
                  color: "var(--success)",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  lineHeight: "1.6",
                }}>
                  Demande envoyee. Verifiez votre boite email — vous allez recevoir votre mot de passe temporaire dans quelques secondes.
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  {forgotError && (
                    <div style={{
                      background: "var(--surface-header)",
                      border: "1px solid #3A1E1E",
                      borderRadius: "2px",
                      padding: "12px 16px",
                      marginBottom: "20px",
                      color: "var(--destructive)",
                      fontSize: "13px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                    }}>
                      {forgotError}
                    </div>
                  )}
                  <div className="mb-5">
                    <label className="label-uppercase block mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="votre@email.fr"
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
                    {resetMutation.isPending ? "Envoi..." : "Demander un mot de passe temporaire"}
                  </button>
                </form>
              )}
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
