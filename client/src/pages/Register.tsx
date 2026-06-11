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
    <div className="min-h-screen flex items-center justify-center px-5"
         style={{ background: "var(--background)" }}>
      <div className="w-full" style={{ maxWidth: "380px" }}>

        {/* -- Wordmark -- */}
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

        {/* -- Card -- */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "40px 36px",
        }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}>
                Compte cree avec succes
              </h2>
              <p style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                lineHeight: "1.6",
                margin: "0 0 28px",
              }}>
                Votre compte a ete cree. Vous pouvez maintenant vous connecter.
              </p>
              <a
                href="/login"
                className="w-full transition-opacity duration-300 ease-out inline-block text-center"
                style={{
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
                Creer mon compte
              </h2>
              <p style={{
                color: "var(--foreground-faint)",
                fontSize: "12px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                textAlign: "center",
                margin: "0 0 28px",
                letterSpacing: "0.02em",
              }}>
                Reserve aux membres autorises de l'equipe Sigma Factory
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
                    Prenom et nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marie Dupont"
                    autoComplete="name"
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
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8 caracteres minimum"
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
                    placeholder="........"
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
                  disabled={registerMutation.isPending}
                  className="w-full transition-opacity duration-300 ease-out"
                  style={{
                    background: registerMutation.isPending ? "var(--gold-muted)" : "var(--gold)",
                    color: "var(--background)",
                    border: "none",
                    borderRadius: "2px",
                    padding: "14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: registerMutation.isPending ? "not-allowed" : "pointer",
                    opacity: registerMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {registerMutation.isPending ? "Creation..." : "Creer mon compte"}
                </button>
              </form>

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
                  Deja un compte
                </p>
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
                  Se connecter
                </a>
              </div>
            </>
          )}
        </div>

        {/* -- Footer -- */}
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
