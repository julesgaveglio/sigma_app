import { Link } from "wouter";

export default function PolitiqueConfidentialite() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "#000", borderBottom: "2px solid #C9A84C", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "4px", cursor: "pointer" }}>
            SIGMA <span style={{ color: "#C9A84C" }}>FACTORY</span>
          </span>
        </Link>
        <Link href="/">
          <span style={{ color: "#C9A84C", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>
            ← Retour à l'accueil
          </span>
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ marginBottom: "40px" }}>
          <p style={{ color: "#C9A84C", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 12px" }}>
            Sigma Factory — Mentions légales
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>
            Politique de Confidentialité
          </h1>
          <p style={{ color: "#666", fontSize: "13px" }}>Dernière mise à jour : avril 2026</p>
        </div>

        <Section title="1. Responsable du traitement">
          <p style={{ marginBottom: "12px" }}>
            Le responsable du traitement des données personnelles collectées via le site{" "}
            <strong>sigmafactory.org</strong> est :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#aaa", fontSize: "14px" }}>
            <tbody>
              {[
                ["Dénomination", "SIGMA FACTORY"],
                ["Forme juridique", "SAS (Société par actions simplifiée)"],
                ["Capital social", "5 000,00 €"],
                ["SIREN", "999 672 777"],
                ["SIRET (siège)", "999 672 777 00011"],
                ["Numéro RCS", "999 672 777 R.C.S. Lyon"],
                ["Inscription au RCS", "Greffe de Lyon, le 13/01/2026"],
                ["Numéro de TVA intracommunautaire", "FR85999672777"],
                ["Siège social", "12 Rue de la Part-Dieu, 69003 Lyon"],
                ["Président", "PENNAVAYRE Bidossessi"],
                ["Contact", "contact@sigmafactory.fr"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#ccc", whiteSpace: "nowrap" }}>{label}</td>
                  <td style={{ padding: "8px 0" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="2. Données collectées">
          <p>Dans le cadre de nos services, nous collectons les données suivantes :</p>
          <ul style={{ color: "#aaa", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Nom, prénom, adresse email, numéro de téléphone</li>
            <li>Situation familiale et professionnelle (formulaire état civil)</li>
            <li>Informations de connexion (adresse IP, date et heure de connexion)</li>
            <li>Données de navigation sur le site</li>
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <p>Vos données sont collectées pour les finalités suivantes :</p>
          <ul style={{ color: "#aaa", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Gestion de votre dossier de courtage ou de recherche immobilière</li>
            <li>Communication relative à votre dossier (emails, notifications)</li>
            <li>Accès à l'espace partenaire (courtiers, agents immobiliers)</li>
            <li>Amélioration de nos services et suivi de la relation client</li>
          </ul>
        </Section>

        <Section title="4. Base légale">
          <p>
            Le traitement de vos données est fondé sur votre <strong>consentement explicite</strong>{" "}
            recueilli lors de la soumission de vos formulaires, ainsi que sur l'exécution d'un contrat
            ou de mesures précontractuelles prises à votre demande (article 6.1.b du RGPD).
          </p>
        </Section>

        <Section title="5. Durée de conservation">
          <p>
            Vos données sont conservées pendant une durée maximale de <strong>3 ans</strong> à compter
            de votre dernière interaction avec nos services, sauf obligation légale contraire.
          </p>
        </Section>

        <Section title="6. Destinataires des données">
          <p>
            Vos données sont traitées exclusivement par l'équipe Sigma Factory. Elles ne sont ni
            vendues, ni cédées à des tiers à des fins commerciales. Elles peuvent être transmises à
            des prestataires techniques (hébergement, envoi d'emails) dans le strict cadre de
            l'exécution du service.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul style={{ color: "#aaa", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li><strong style={{ color: "#fff" }}>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong style={{ color: "#fff" }}>Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong style={{ color: "#fff" }}>Droit à l'effacement</strong> : demander la suppression de vos données</li>
            <li><strong style={{ color: "#fff" }}>Droit d'opposition</strong> : vous opposer à un traitement</li>
            <li><strong style={{ color: "#fff" }}>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
          </ul>
          <p style={{ marginTop: "16px" }}>
            Pour exercer ces droits, contactez-nous à :{" "}
            <a href="mailto:contact@sigmafactory.fr" style={{ color: "#C9A84C" }}>contact@sigmafactory.fr</a>.
            Vous disposez également du droit d'introduire une réclamation auprès de la{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" style={{ color: "#C9A84C" }}>CNIL</a>.
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
            protéger vos données contre tout accès non autorisé, perte ou divulgation.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            Le site utilise des cookies strictement nécessaires au fonctionnement de l'authentification
            et de la session. Aucun cookie de tracking publicitaire n'est utilisé.
          </p>
        </Section>

        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid #222", color: "#555", fontSize: "12px", textAlign: "center" }}>
          Sigma Factory — <a href="mailto:contact@sigmafactory.fr" style={{ color: "#666" }}>contact@sigmafactory.fr</a>
          {" · "}
          <Link href="/mentions-legales"><span style={{ color: "#666", cursor: "pointer", textDecoration: "underline" }}>Mentions légales</span></Link>
          {" · "}
          <Link href="/"><span style={{ color: "#666", cursor: "pointer" }}>sigmafactory.org</span></Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#C9A84C", letterSpacing: "1px", marginBottom: "12px", borderBottom: "1px solid #1e1e1e", paddingBottom: "8px" }}>
        {title}
      </h2>
      <div style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.8" }}>
        {children}
      </div>
    </div>
  );
}
