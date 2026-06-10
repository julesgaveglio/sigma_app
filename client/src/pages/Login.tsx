import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Ouvrir directement le formulaire mot de passe oublié si ?forgot=1 dans l'URL
  const [showForgot, setShowForgot] = useState(() => new URLSearchParams(window.location.search).get("forgot") === "1");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      // Redirection intelligente selon le rôle et l'email
      const userEmail = data?.user?.email ?? "";
      const userRole = data?.user?.role ?? "user";
      if (userRole === "admin") {
        navigate("/dashboard");
      } else if (userRole === "direction") {
        // Redirection personnalisée selon l'email
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
        // Agents immobiliers → portail membre (espace agent)
        navigate("/dashboard/portail");
      } else if (userRole === "courtier") {
        // Courtiers → espace courtier dédié
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
    <div style={{
      minHeight: "100vh",
      background: "#111111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      padding: "20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            background: "linear-gradient(135deg, #C9A84C, #E8C96A)",
            borderRadius: "16px",
            marginBottom: "16px",
          }}>
            <span style={{ fontSize: "28px", fontWeight: "900", color: "#111", letterSpacing: "-1px" }}>Σ</span>
          </div>
          <h1 style={{
            color: "#C9A84C",
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "3px",
            margin: "0 0 4px",
            textTransform: "uppercase",
          }}>SIGMA FACTORY</h1>
          <p style={{ color: "#666", fontSize: "13px", margin: 0 }}>Application interne — Accès réservé</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "16px",
          padding: "36px 32px",
        }}>
          {!showForgot ? (
            <>
              <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "600", margin: "0 0 24px", textAlign: "center" }}>
                Connexion
              </h2>

              {error && (
                <div style={{
                  background: "#2a1515",
                  border: "1px solid #5a2020",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  color: "#ff6b6b",
                  fontSize: "13px",
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    autoComplete="email"
                    style={{
                      width: "100%",
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={e => (e.target.style.borderColor = "#333")}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={e => (e.target.style.borderColor = "#333")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  style={{
                    width: "100%",
                    background: loginMutation.isPending ? "#8a7030" : "linear-gradient(135deg, #C9A84C, #E8C96A)",
                    color: "#111",
                    border: "none",
                    borderRadius: "8px",
                    padding: "13px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  {loginMutation.isPending ? "Connexion..." : "Se connecter"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button
                  onClick={() => { setShowForgot(true); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C9A84C",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <div style={{ borderTop: "1px solid #2a2a2a", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
                <p style={{ color: "#555", fontSize: "12px", margin: "0 0 8px" }}>Pas encore de compte ?</p>
                <a
                  href="/register"
                  style={{
                    color: "#C9A84C",
                    fontSize: "13px",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  Créer mon compte →
                </a>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "0 0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ← Retour
              </button>

              <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "600", margin: "0 0 8px" }}>
                Mot de passe oublié
              </h2>
              <p style={{ color: "#666", fontSize: "13px", margin: "0 0 24px", lineHeight: "1.5" }}>
                Entrez votre adresse email. Un mot de passe temporaire vous sera envoyé directement par email.
              </p>

              {forgotSent ? (
                <div style={{
                  background: "#0d2a1a",
                  border: "1px solid #1a5c30",
                  borderRadius: "8px",
                  padding: "16px",
                  color: "#4caf7d",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}>
                  ✓ Demande envoyée. Vérifiez votre boîte email (et vos spams) — vous allez recevoir votre mot de passe temporaire dans quelques secondes.
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  {forgotError && (
                    <div style={{
                      background: "#2a1515",
                      border: "1px solid #5a2020",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      color: "#ff6b6b",
                      fontSize: "13px",
                    }}>
                      {forgotError}
                    </div>
                  )}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="votre@email.fr"
                      style={{
                        width: "100%",
                        background: "#111",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        color: "#fff",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                      onBlur={e => (e.target.style.borderColor = "#333")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetMutation.isPending}
                    style={{
                      width: "100%",
                      background: resetMutation.isPending ? "#8a7030" : "linear-gradient(135deg, #C9A84C, #E8C96A)",
                      color: "#111",
                      border: "none",
                      borderRadius: "8px",
                      padding: "13px",
                      fontSize: "15px",
                      fontWeight: "700",
                      cursor: resetMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {resetMutation.isPending ? "Envoi..." : "Demander un mot de passe temporaire"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: "11px", marginTop: "24px" }}>
          Sigma Factory — Application interne confidentielle
        </p>
      </div>
    </div>
  );
}
