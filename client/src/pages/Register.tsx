import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Erreur lors de la création du compte.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirm) {
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

    registerMutation.mutate({ name, email, password });
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
      <div style={{ width: "100%", maxWidth: "420px" }}>
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
          <p style={{ color: "#666", fontSize: "13px", margin: 0 }}>Créer votre compte</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "16px",
          padding: "36px 32px",
        }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "linear-gradient(135deg, #C9A84C, #E8C96A)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: "24px",
              }}>✓</div>
              <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "600", margin: "0 0 12px" }}>
                Compte créé avec succès !
              </h2>
              <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
                Votre compte a été créé. Vous pouvez maintenant vous connecter.
              </p>
              <a
                href="/login"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #C9A84C, #E8C96A)",
                  color: "#111",
                  textDecoration: "none",
                  borderRadius: "8px",
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                Se connecter →
              </a>
            </div>
          ) : (
            <>
              <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "600", margin: "0 0 6px", textAlign: "center" }}>
                Créer mon compte
              </h2>
              <p style={{ color: "#555", fontSize: "12px", textAlign: "center", margin: "0 0 24px" }}>
                Réservé aux membres autorisés de l'équipe Sigma Factory
              </p>

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

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Prénom et nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marie Dupont"
                    autoComplete="name"
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

                <div style={{ marginBottom: "14px" }}>
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
                    }}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={e => (e.target.style.borderColor = "#333")}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
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

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", color: "#999", fontSize: "12px", fontWeight: "500", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
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
                  disabled={registerMutation.isPending}
                  style={{
                    width: "100%",
                    background: registerMutation.isPending ? "#8a7030" : "linear-gradient(135deg, #C9A84C, #E8C96A)",
                    color: "#111",
                    border: "none",
                    borderRadius: "8px",
                    padding: "13px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: registerMutation.isPending ? "not-allowed" : "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  {registerMutation.isPending ? "Création..." : "Créer mon compte"}
                </button>
              </form>

              <div style={{ borderTop: "1px solid #2a2a2a", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
                <p style={{ color: "#555", fontSize: "12px", margin: "0 0 8px" }}>Déjà un compte ?</p>
                <a
                  href="/login"
                  style={{
                    color: "#C9A84C",
                    fontSize: "13px",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  Se connecter →
                </a>
              </div>
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
