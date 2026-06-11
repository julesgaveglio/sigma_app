import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        {/* ── Wordmark ── */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "var(--gold)",
          lineHeight: 1,
          marginBottom: "12px",
          textTransform: "uppercase" as const,
        }}>
          Sigma Factory
        </h1>
        <div style={{
          width: "40px",
          height: "1px",
          background: "var(--border)",
          marginBottom: "32px",
        }} />

        {loading ? (
          <Loader2
            size={20}
            style={{ color: "var(--foreground-faint)" }}
            className="animate-spin"
          />
        ) : (
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "14px",
            color: "var(--foreground-muted)",
            lineHeight: "1.6",
            textAlign: "center",
            maxWidth: "400px",
          }}>
            Plateforme interne — Conseil en immobilier et financement
          </p>
        )}

        {/* ── CTA ── */}
        <div style={{ marginTop: "48px", display: "flex", gap: "12px" }}>
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="transition-opacity duration-300 ease-out"
              style={{
                display: "inline-block",
                background: "var(--gold)",
                color: "var(--background)",
                border: "none",
                borderRadius: "2px",
                padding: "14px 28px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                textDecoration: "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Acceder au tableau de bord
            </a>
          ) : (
            <a
              href="/login"
              className="transition-opacity duration-300 ease-out"
              style={{
                display: "inline-block",
                background: "var(--gold)",
                color: "var(--background)",
                border: "none",
                borderRadius: "2px",
                padding: "14px 28px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                textDecoration: "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Se connecter
            </a>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: "10px",
          color: "var(--border)",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          marginTop: "80px",
        }}>
          Application interne confidentielle
        </p>
      </main>
    </div>
  );
}
