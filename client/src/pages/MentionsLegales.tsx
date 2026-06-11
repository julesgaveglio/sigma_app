import { Link } from "wouter";

export default function MentionsLegales() {
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
            Sigma Factory — Conformite legale
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
            Mentions Legales
          </h1>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "12px",
            color: "#3A3632",
            lineHeight: "1.6",
          }}>
            Conformement aux articles 6-III et 19 de la Loi n. 2004-575 du 21 juin 2004 pour la Confiance dans l'Economie Numerique (LCEN).
          </p>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "12px",
            color: "#3A3632",
            marginTop: "4px",
          }}>
            Derniere mise a jour : avril 2026
          </p>
        </div>

        <Section title="1. Editeur du site">
          <p style={{ marginBottom: "12px" }}>
            Le site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> est edite par :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <tbody>
              {[
                ["Denomination sociale", "SIGMA FACTORY"],
                ["Forme juridique", "SAS (Societe par actions simplifiee)"],
                ["Capital social", "5 000,00 EUR"],
                ["SIREN", "999 672 777"],
                ["SIRET (siege)", "999 672 777 00011"],
                ["Numero RCS", "999 672 777 R.C.S. Lyon"],
                ["Inscription au RCS", "Greffe de Lyon, le 13/01/2026"],
                ["Numero de TVA intracommunautaire", "FR85999672777"],
                ["Siege social", "12 Rue de la Part-Dieu, 69003 Lyon"],
                ["Telephone", "Non communique publiquement"],
                ["Email de contact", "contact@sigmafactory.fr"],
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

        <Section title="2. Directeur de la publication">
          <p>
            Le directeur de la publication du site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> est :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "12px" }}>
            <tbody>
              {[
                ["Nom", "PENNAVAYRE Bidossessi"],
                ["Qualite", "President de SIGMA FACTORY"],
                ["Email", "contact@sigmafactory.fr"],
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

        <Section title="3. Hebergeur du site">
          <p style={{ marginBottom: "12px" }}>
            Le site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> est heberge par :
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <tbody>
              {[
                ["Societe", "A definir"],
                ["Site web", "sigmafactory.fr"],
                ["Contact", "contact@sigmafactory.fr"],
                ["Localisation des serveurs", "Europe (eu-west)"],
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
                    {value?.startsWith("http") ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#C9A84C", textDecoration: "none" }}>{value}</a>
                    ) : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. Activite reglementee">
          <p style={{ marginBottom: "12px" }}>
            Sigma Factory exerce ses activites de courtage en credit immobilier et de transaction immobiliere sous le couvert de l'immatriculation reglementee de son fondateur,{" "}
            <strong style={{ color: "#F0EDE6" }}>ARIAS PATRIMOINE</strong> (SIREN 844 065 094), societe inscrite a l'ORIAS et au fichier des professionnels de l'immobilier.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <tbody>
              {[
                ["Entite habilitante", "ARIAS PATRIMOINE — SIREN 844 065 094"],
                ["Numero ORIAS", "19000655 (inscrit depuis le 15/02/2019)"],
                ["Qualite ORIAS", "Courtier en Assurance (COA) sans maniement de fonds"],
                ["Autorite de tutelle", "Autorite de Controle Prudentiel et de Resolution (ACPR)"],
                ["Verification ORIAS", "www.orias.fr"],
                ["Carte professionnelle immobiliere", "CPI69012019000039125"],
                ["Delivree par", "CCI Lyon Metropole Saint-Etienne Roanne"],
                ["Garantie financiere", "110 000 EUR"],
                ["Activite couverte", "Transaction immobiliere — INSCRIT"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #151515" }}>
                  <td style={{
                    padding: "8px 12px 8px 0",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    color: "#6B6560",
                    width: "45%",
                  }}>
                    {label}
                  </td>
                  <td style={{
                    padding: "8px 0",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                  }}>
                    {value === "www.orias.fr" ? (
                      <a href="https://www.orias.fr" target="_blank" rel="noopener noreferrer" className="transition-opacity duration-300 ease-out hover:opacity-70" style={{ color: "#C9A84C", textDecoration: "none" }}>www.orias.fr</a>
                    ) : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="5. Propriete intellectuelle">
          <p>
            L'ensemble des elements constituant le site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> (textes, graphismes, logotypes, icones, images, sons, logiciels) est la propriete exclusive de <strong style={{ color: "#F0EDE6" }}>SIGMA FACTORY</strong> ou de ses partenaires.
          </p>
          <p style={{ marginTop: "12px" }}>
            Toute reproduction, representation, modification, publication ou adaptation de tout ou partie des elements du site, quel que soit le moyen ou le procede utilise, est interdite sans l'autorisation ecrite prealable de SIGMA FACTORY.
          </p>
        </Section>

        <Section title="6. Limitation de responsabilite">
          <p>
            SIGMA FACTORY s'efforce d'assurer l'exactitude et la mise a jour des informations diffusees sur le site. Toutefois, SIGMA FACTORY ne peut garantir l'exactitude, la precision ou l'exhaustivite des informations mises a disposition sur ce site.
          </p>
          <p style={{ marginTop: "12px" }}>
            SIGMA FACTORY decline toute responsabilite pour tout dommage resultant d'une intrusion frauduleuse d'un tiers ayant entraine une modification des informations mises a disposition sur le site.
          </p>
        </Section>

        <Section title="7. Liens hypertextes">
          <p>
            Le site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> peut contenir des liens vers d'autres sites internet. SIGMA FACTORY n'exerce aucun controle sur ces sites et decline toute responsabilite quant a leur contenu ou leur politique de confidentialite.
          </p>
          <p style={{ marginTop: "12px" }}>
            La creation de liens hypertextes vers le site <strong style={{ color: "#F0EDE6" }}>sigmafactory.org</strong> est soumise a l'accord prealable et ecrit de SIGMA FACTORY.
          </p>
        </Section>

        <Section title="8. Protection des donnees personnelles">
          <p>
            Les informations relatives a la collecte et au traitement des donnees personnelles sont detaillees dans notre{" "}
            <Link href="/politique-confidentialite">
              <span className="transition-opacity duration-300 ease-out hover:opacity-70" style={{ color: "#C9A84C", cursor: "pointer" }}>Politique de Confidentialite</span>
            </Link>.
          </p>
          <p style={{ marginTop: "12px" }}>
            Conformement au Reglement General sur la Protection des Donnees (RGPD — Reglement UE 2016/679) et a la loi Informatique et Libertes du 6 janvier 1978 modifiee, vous disposez d'un droit d'acces, de rectification, d'effacement et de portabilite de vos donnees.
          </p>
          <p style={{ marginTop: "12px" }}>
            Pour exercer ces droits, contactez-nous a :{" "}
            <a href="mailto:contact@sigmafactory.fr" className="transition-opacity duration-300 ease-out hover:opacity-70" style={{ color: "#C9A84C", textDecoration: "none" }}>contact@sigmafactory.fr</a>.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            Le site utilise des cookies strictement necessaires au fonctionnement de l'authentification et a la gestion des sessions utilisateurs. Aucun cookie de suivi publicitaire ou de profilage n'est depose.
          </p>
          <p style={{ marginTop: "12px" }}>
            Conformement a la reglementation en vigueur, ces cookies techniques ne necessitent pas de consentement prealable.
          </p>
        </Section>

        <Section title="10. Droit applicable et juridiction competente">
          <p>
            Les presentes mentions legales sont regies par le droit francais. En cas de litige, et apres tentative de resolution amiable, les tribunaux competents du ressort du siege social de SIGMA FACTORY (Lyon) seront seuls competents.
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
            <Link href="/politique-confidentialite">
              <span style={{ color: "#3A3632", cursor: "pointer" }}>Politique de confidentialite</span>
            </Link>
            {" · "}
            <Link href="/">
              <span style={{ color: "#3A3632", cursor: "pointer" }}>sigmafactory.org</span>
            </Link>
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
