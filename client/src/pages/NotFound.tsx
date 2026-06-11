import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0A0A0A" }}>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "72px",
        fontWeight: 700,
        color: "#1E1E1E",
        lineHeight: 1,
        letterSpacing: "0.08em",
      }}>
        404
      </p>
      <p style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontSize: "14px",
        color: "#6B6560",
        marginTop: "16px",
        letterSpacing: "0.02em",
      }}>
        Cette page n'existe pas ou a ete deplacee.
      </p>
      <button
        onClick={handleGoHome}
        className="transition-opacity duration-300 hover:opacity-80"
        style={{
          marginTop: "32px",
          background: "none",
          border: "none",
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          color: "#C9A84C",
          letterSpacing: "0.06em",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Retour a l'accueil
      </button>
    </div>
  );
}
