import { Link } from "wouter";

export default function PolitiqueConfidentialite() {
  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", color: "#F0EDE6" }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: "1px solid #1E1E1E",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "720px",
        margin: "0 auto",
      }}>
        <Link href="/">
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#F0EDE6",
            cursor: "pointer",
            textTransform: "uppercase" as const,
          }}>
            Sigma Factory
          </span>
        </Link>
        <Link href="/">
          <span className="transition-opacity duration-300 ease-out hover:opacity-70" style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "12px",
            color: "#6B6560",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}>
            Retour a l'accueil
          </span>
        </Link>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ marginBottom: "48px" }}>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            color: "#6B6560",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginBottom: "12px",
          }}>
            Sigma Factory — Mentions legales
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            margin: "0 0 8px",
          }}>
            Politique de Confidentialite
          </h1>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "12px",
            color: "#3A3632",
          }}>
            Derniere mise a jour : avril 2026
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p style={{ marginBottom: "12px" }}>
            Le responsable du traitement des donnees personnelles collectees via le site{" "}
            <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> est :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <tbody>
              {[
                ["Denomination", "SIGMA FACTORY"],
                ["Forme juridique", "SAS (Societe par actions simplifiee)"],
                ["Capital social", "5 000,00 EUR"],
                ["SIREN", "999 672 777"],
                ["SIRET (siege)", "999 672 777 00011"],
                ["Numero RCS", "999 672 777 R.C.S. Lyon"],
                ["Inscription au RCS", "Greffe de Lyon, le 13/01/2026"],
                ["Numero de TVA intracommunautaire", "FR85999672777"],
                ["Siege social", "12 Rue de la Part-Dieu, 69003 Lyon"],
                ["President", "PENNAVAYRE Bidossessi"],
                ["Contact", "contact@sigmafactory.fr"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #151515" }}>
                  <td style={{
                    padding: "8px 12px 8px 0",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    color: "#6B6560",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </td>
                  <td style={{
                    padding: "8px 0",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                  }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="2. Donnees collectees">
          <p>Dans le cadre de nos services, nous collectons les donnees suivantes :</p>
          <ul style={{ color: "#6B6560", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Nom, prenom, adresse email, numero de telephone</li>
            <li>Situation familiale et professionnelle (formulaire etat civil)</li>
            <li>Informations de connexion (adresse IP, date et heure de connexion)</li>
            <li>Donnees de navigation sur le site</li>
          </ul>
        </Section>

        <Section title="3. Finalites du traitement">
          <p>Vos donnees sont collectees pour les finalites suivantes :</p>
          <ul style={{ color: "#6B6560", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Gestion de votre dossier de courtage ou de recherche immobiliere</li>
            <li>Communication relative a votre dossier (emails, notifications)</li>
            <li>Acces a l'espace partenaire (courtiers, agents immobiliers)</li>
            <li>Amelioration de nos services et suivi de la relation client</li>
          </ul>
        </Section>

        <Section title="4. Base legale">
          <p>
            Le traitement de vos donnees est fonde sur votre <strong style={{ color: "#F0EDE6" }}>consentement explicite</strong>{" "}
            recueilli lors de la soumission de vos formulaires, ainsi que sur l'execution d'un contrat
            ou de mesures precontractuelles prises a votre demande (article 6.1.b du RGPD).
          </p>
        </Section>

        <Section title="5. Duree de conservation">
          <p>
            Vos donnees sont conservees pendant une duree maximale de <strong style={{ color: "#F0EDE6" }}>3 ans</strong> a compter
            de votre derniere interaction avec nos services, sauf obligation legale contraire.
          </p>
        </Section>

        <Section title="6. Destinataires des donnees">
          <p>
            Vos donnees sont traitees exclusivement par l'equipe Sigma Factory. Elles ne sont ni
            vendues, ni cedees a des tiers a des fins commerciales. Elles peuvent etre transmises a
            des prestataires techniques (hebergement, envoi d'emails) dans le strict cadre de
            l'execution du service.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>Conformement au RGPD, vous disposez des droits suivants :</p>
          <ul style={{ color: "#6B6560", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li><strong style={{ color: "#F0EDE6" }}>Droit d'acces</strong> : obtenir une copie de vos donnees</li>
            <li><strong style={{ color: "#F0EDE6" }}>Droit de rectification</strong> : corriger des donnees inexactes</li>
            <li><strong style={{ color: "#F0EDE6" }}>Droit a l'effacement</strong> : demander la suppression de vos donnees</li>
            <li><strong style={{ color: "#F0EDE6" }}>Droit d'opposition</strong> : vous opposer a un traitement</li>
            <li><strong style={{ color: "#F0EDE6" }}>Droit a la portabilite</strong> : recevoir vos donnees dans un format structure</li>
          </ul>
          <p style={{ marginTop: "16px" }}>
            Pour exercer ces droits, contactez-nous a :{" "}
            <a href="mailto:contact@sigmafactory.fr" className="transition-opacity duration-300 ease-out hover:opacity-70" style={{ color: "#C9A84C", textDecoration: "none" }}>contact@sigmafactory.fr</a>.
            Vous disposez egalement du droit d'introduire une reclamation aupres de la{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="transition-opacity duration-300 ease-out hover:opacity-70" style={{ color: "#C9A84C", textDecoration: "none" }}>CNIL</a>.
          </p>
        </Section>

        <Section title="8. Securite">
          <p>
            Nous mettons en oeuvre des mesures techniques et organisationnelles appropriees pour
            proteger vos donnees contre tout acces non autorise, perte ou divulgation.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            Le site utilise des cookies strictement necessaires au fonctionnement de l'authentification
            et de la session. Aucun cookie de tracking publicitaire n'est utilise.
          </p>
        </Section>

        {/* ── Footer ── */}
        <div style={{
          marginTop: "60px",
          paddingTop: "24px",
          borderTop: "1px solid #1E1E1E",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "11px",
            color: "#3A3632",
            letterSpacing: "0.04em",
          }}>
            Sigma Factory —{" "}
            <a href="mailto:contact@sigmafactory.fr" style={{ color: "#3A3632", textDecoration: "none" }}>contact@sigmafactory.fr</a>
            {" · "}
            <Link href="/mentions-legales"><span style={{ color: "#3A3632", cursor: "pointer" }}>Mentions legales</span></Link>
            {" · "}
            <Link href="/"><span style={{ color: "#3A3632", cursor: "pointer" }}>sigmafactory.org</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "16px",
        fontWeight: 600,
        color: "#F0EDE6",
        letterSpacing: "0.04em",
        marginBottom: "12px",
        paddingBottom: "8px",
        borderBottom: "1px solid #1E1E1E",
      }}>
        {title}
      </h2>
      <div style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        color: "#6B6560",
        fontSize: "13px",
        lineHeight: "1.8",
      }}>
        {children}
      </div>
    </div>
  );
}
