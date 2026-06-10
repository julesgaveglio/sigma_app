import { Link } from "wouter";

export default function MentionsLegales() {
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
            Sigma Factory — Conformité légale
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>
            Mentions Légales
          </h1>
          <p style={{ color: "#666", fontSize: "13px" }}>
            Conformément aux articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN).
          </p>
          <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>Dernière mise à jour : avril 2026</p>
        </div>

        <Section title="1. Éditeur du site">
          <p style={{ marginBottom: "12px" }}>
            Le site <strong>sigmafactory.org</strong> est édité par :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#aaa", fontSize: "14px" }}>
            <tbody>
              {[
                ["Dénomination sociale", "SIGMA FACTORY"],
                ["Forme juridique", "SAS (Société par actions simplifiée)"],
                ["Capital social", "5 000,00 €"],
                ["SIREN", "999 672 777"],
                ["SIRET (siège)", "999 672 777 00011"],
                ["Numéro RCS", "999 672 777 R.C.S. Lyon"],
                ["Inscription au RCS", "Greffe de Lyon, le 13/01/2026"],
                ["Numéro de TVA intracommunautaire", "FR85999672777"],
                ["Siège social", "12 Rue de la Part-Dieu, 69003 Lyon"],
                ["Téléphone", "Non communiqué publiquement"],
                ["Email de contact", "contact@sigmafactory.fr"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#ccc", whiteSpace: "nowrap" }}>{label}</td>
                  <td style={{ padding: "8px 0" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="2. Directeur de la publication">
          <p>
            Le directeur de la publication du site <strong>sigmafactory.org</strong> est :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#aaa", fontSize: "14px", marginTop: "12px" }}>
            <tbody>
              {[
                ["Nom", "PENNAVAYRE Bidossessi"],
                ["Qualité", "Président de SIGMA FACTORY"],
                ["Email", "contact@sigmafactory.fr"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#ccc", whiteSpace: "nowrap" }}>{label}</td>
                  <td style={{ padding: "8px 0" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="3. Hébergeur du site">
          <p style={{ marginBottom: "12px" }}>
            Le site <strong>sigmafactory.org</strong> est hébergé par :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#aaa", fontSize: "14px" }}>
            <tbody>
              {[
                ["Société", "Manus AI Inc."],
                ["Site web", "manus.im"],
                ["Contact", "https://help.manus.im"],
                ["Localisation des serveurs", "États-Unis (us-east)"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#ccc", whiteSpace: "nowrap" }}>{label}</td>
                  <td style={{ padding: "8px 0" }}>
                    {value.startsWith("http") ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#C9A84C" }}>{value}</a>
                    ) : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. Activité réglementée">
          <p style={{ marginBottom: "12px" }}>
            Sigma Factory exerce ses activités de courtage en crédit immobilier et de transaction immobilière sous le couvert de l'immatriculation réglementée de son fondateur,{" "}
            <strong>ARIAS PATRIMOINE</strong> (SIREN 844 065 094), société inscrite à l'ORIAS et au fichier des professionnels de l'immobilier.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#aaa", fontSize: "14px" }}>
            <tbody>
              {[
                ["Entité habilitante", "ARIAS PATRIMOINE — SIREN 844 065 094"],
                ["Numéro ORIAS", "19000655 (inscrit depuis le 15/02/2019)"],
                ["Qualité ORIAS", "Courtier en Assurance (COA) sans maniement de fonds"],
                ["Autorité de tutelle", "Autorité de Contrôle Prudentiel et de Résolution (ACPR)"],
                ["Vérification ORIAS", "www.orias.fr"],
                ["Carte professionnelle immobilière", "CPI69012019000039125"],
                ["Délivrée par", "CCI Lyon Métropole Saint-Étienne Roanne"],
                ["Garantie financière", "110 000 €"],
                ["Activité couverte", "Transaction immobilière — INSCRIT"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#ccc", width: "45%" }}>{label}</td>
                  <td style={{ padding: "8px 0" }}>
                    {value === "www.orias.fr" ? (
                      <a href="https://www.orias.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#C9A84C" }}>www.orias.fr</a>
                    ) : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="5. Propriété intellectuelle">
          <p>
            L'ensemble des éléments constituant le site <strong>sigmafactory.org</strong> (textes, graphismes, logotypes, icônes, images, sons, logiciels) est la propriété exclusive de <strong>SIGMA FACTORY</strong> ou de ses partenaires.
          </p>
          <p style={{ marginTop: "12px" }}>
            Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de SIGMA FACTORY.
          </p>
        </Section>

        <Section title="6. Limitation de responsabilité">
          <p>
            SIGMA FACTORY s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. Toutefois, SIGMA FACTORY ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site.
          </p>
          <p style={{ marginTop: "12px" }}>
            SIGMA FACTORY décline toute responsabilité pour tout dommage résultant d'une intrusion frauduleuse d'un tiers ayant entraîné une modification des informations mises à disposition sur le site.
          </p>
        </Section>

        <Section title="7. Liens hypertextes">
          <p>
            Le site <strong>sigmafactory.org</strong> peut contenir des liens vers d'autres sites internet. SIGMA FACTORY n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou leur politique de confidentialité.
          </p>
          <p style={{ marginTop: "12px" }}>
            La création de liens hypertextes vers le site <strong>sigmafactory.org</strong> est soumise à l'accord préalable et écrit de SIGMA FACTORY.
          </p>
        </Section>

        <Section title="8. Protection des données personnelles">
          <p>
            Les informations relatives à la collecte et au traitement des données personnelles sont détaillées dans notre{" "}
            <Link href="/politique-confidentialite">
              <span style={{ color: "#C9A84C", cursor: "pointer", textDecoration: "underline" }}>Politique de Confidentialité</span>
            </Link>.
          </p>
          <p style={{ marginTop: "12px" }}>
            Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données.
          </p>
          <p style={{ marginTop: "12px" }}>
            Pour exercer ces droits, contactez-nous à :{" "}
            <a href="mailto:contact@sigmafactory.fr" style={{ color: "#C9A84C" }}>contact@sigmafactory.fr</a>.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            Le site utilise des cookies strictement nécessaires au fonctionnement de l'authentification et à la gestion des sessions utilisateurs. Aucun cookie de suivi publicitaire ou de profilage n'est déposé.
          </p>
          <p style={{ marginTop: "12px" }}>
            Conformément à la réglementation en vigueur, ces cookies techniques ne nécessitent pas de consentement préalable.
          </p>
        </Section>

        <Section title="10. Droit applicable et juridiction compétente">
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux compétents du ressort du siège social de SIGMA FACTORY (Lyon) seront seuls compétents.
          </p>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid #222", color: "#555", fontSize: "12px", textAlign: "center" }}>
          Sigma Factory — <a href="mailto:contact@sigmafactory.fr" style={{ color: "#666" }}>contact@sigmafactory.fr</a>
          {" · "}
          <Link href="/politique-confidentialite">
            <span style={{ color: "#666", cursor: "pointer", textDecoration: "underline" }}>Politique de confidentialité</span>
          </Link>
          {" · "}
          <Link href="/">
            <span style={{ color: "#666", cursor: "pointer" }}>sigmafactory.org</span>
          </Link>
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
