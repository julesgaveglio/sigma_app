import { Resend } from "resend";

// ─── Adresses email par rôle ─────────────────────────────────────────────────
export const ROLE_EMAILS: Record<string, string[]> = {
  // Custom Care + Sigma Crédit (Hanna)
  Hanna:  ["assistance.direction@sigmaipf.fr"],
  // Welcome Call + Point Personnalisé (Maria)
  Maria:  ["maria@sigmaipf.fr"],
  // Courtage (Manon)
  Manon:  ["manondubost@sigmaipf.fr"],
  // Immo (Élodie)
  Elodie: ["elodie@sigmafactory.fr"],
};

// Owner — reçoit toutes les notifications
export const OWNER_EMAILS = ["contact@sigmafactory.fr"];

// Destinataires fixes de l'équipe Sigma Factory (toutes les notifs)
const TEAM_EMAILS = [
  "contact@sigmafactory.fr",
  "assistance.direction@sigmaipf.fr",
  "maria@sigmaipf.fr",
  "manondubost@sigmaipf.fr",
  "elodie@sigmafactory.fr",
];

export type LeadEmailData = {
  nom: string;
  prenoms: string;
  email?: string;
  telephonePortable?: string;
  situationFamiliale?: string;
  nationalite?: string;
  leadId: number;
};

export async function sendNewLeadNotification(lead: LeadEmailData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const situationLabel: Record<string, string> = {
      celibataire: "Célibataire",
      marie: "Marié(e)",
      divorce: "Divorcé(e)",
      instance_divorce: "En instance de divorce",
      pacs: "Pacsé(e)",
      veuf: "Veuf/Veuve",
    };

    const nationaliteLabel: Record<string, string> = {
      francais: "Français(e)",
      francais_etranger: "Français(e) né(e) à l'étranger",
      etranger: "Étranger(e)",
    };

    const dashboardUrl = "https://www.sigmafactory.org/dashboard";

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #D4AF37; margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { color: #999; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #D4AF37; color: #1a1a1a; font-weight: bold; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
    .field { margin-bottom: 12px; }
    .field label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
    .field span { font-size: 15px; color: #222; font-weight: 500; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .cta { text-align: center; margin-top: 28px; }
    .cta a { background: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; }
    .footer { background: #f9f9f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIGMA FACTORY</h1>
      <p>Nouvelle fiche d'état civil reçue</p>
    </div>
    <div class="body">
      <div class="badge">Nouveau lead #${lead.leadId}</div>
      <div class="field">
        <label>Nom complet</label>
        <span>${lead.nom} ${lead.prenoms}</span>
      </div>
      <div class="field">
        <label>Email</label>
        <span>${lead.email || "—"}</span>
      </div>
      <div class="field">
        <label>Téléphone portable</label>
        <span>${lead.telephonePortable || "—"}</span>
      </div>
      <hr class="divider">
      <div class="field">
        <label>Situation familiale</label>
        <span>${lead.situationFamiliale ? (situationLabel[lead.situationFamiliale] ?? lead.situationFamiliale) : "—"}</span>
      </div>
      <div class="field">
        <label>Nationalité</label>
        <span>${lead.nationalite ? (nationaliteLabel[lead.nationalite] ?? lead.nationalite) : "—"}</span>
      </div>
      <div class="cta">
        <a href="${dashboardUrl}">Voir le tableau de bord</a>
      </div>
    </div>
    <div class="footer">
      Sigma Factory — Système de gestion des fiches d'état civil
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: TEAM_EMAILS,
      subject: `Nouveau lead : ${lead.nom} ${lead.prenoms} (#${lead.leadId})`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Mailer] Erreur Resend:", error);
      return false;
    }

    console.log(`[Mailer] Email envoyé avec succès pour le lead #${lead.leadId}`);
    return true;
  } catch (error) {
    console.error("[Mailer] Erreur lors de l'envoi:", error);
    return false;
  }
}

export type MandatEmailData = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  typeBien: string;
  localisation: string;
  budgetMax?: number;
  modeFinancement?: string;
  mandatId: number;
};

export async function sendNewMandatNotification(mandat: MandatEmailData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const typeBienLabel: Record<string, string> = {
      appartement: "Appartement",
      maison: "Maison",
      villa: "Villa",
      terrain: "Terrain",
      local_commercial: "Local commercial",
      autre: "Autre",
    };

    const financementLabel: Record<string, string> = {
      comptant: "Comptant",
      credit: "Crédit immobilier",
      mixte: "Mixte (apport + crédit)",
    };

    const dashboardUrl = "https://www.sigmafactory.org/dashboard/mandats";

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #D4AF37; margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { color: #999; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #D4AF37; color: #1a1a1a; font-weight: bold; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
    .field { margin-bottom: 12px; }
    .field label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
    .field span { font-size: 15px; color: #222; font-weight: 500; }
    .highlight { background: #fffbeb; border-left: 3px solid #D4AF37; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .highlight .amount { font-size: 22px; font-weight: bold; color: #1a1a1a; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .cta { text-align: center; margin-top: 28px; }
    .cta a { background: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; }
    .footer { background: #f9f9f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIGMA FACTORY</h1>
      <p>Nouveau Mandat de Recherche reçu</p>
    </div>
    <div class="body">
      <div class="badge">Mandat #${mandat.mandatId}</div>
      <div class="field">
        <label>Acquéreur</label>
        <span>${mandat.nom} ${mandat.prenoms}</span>
      </div>
      <div class="field">
        <label>Email</label>
        <span>${mandat.email}</span>
      </div>
      <div class="field">
        <label>Téléphone</label>
        <span>${mandat.telephone}</span>
      </div>
      <hr class="divider">
      <div class="field">
        <label>Type de bien</label>
        <span>${typeBienLabel[mandat.typeBien] ?? mandat.typeBien}</span>
      </div>
      <div class="field">
        <label>Localisation souhaitée</label>
        <span>${mandat.localisation}</span>
      </div>
      <div class="highlight">
        <label style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Budget maximum</label>
        <div class="amount">${mandat.budgetMax ? mandat.budgetMax.toLocaleString('fr-FR') + ' €' : 'À définir après validation de l\'enveloppe en courtage'}</div>
      </div>
      <div class="field">
        <label>Mode de financement</label>
        <span>${mandat.modeFinancement ? (financementLabel[mandat.modeFinancement] ?? mandat.modeFinancement) : 'À définir'}</span>
      </div>
      <div class="cta">
        <a href="${dashboardUrl}">Voir le tableau de bord Mandats</a>
      </div>
    </div>
    <div class="footer">
      Sigma Factory — Système de gestion des mandats de recherche
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: TEAM_EMAILS,
      subject: `Nouveau mandat de recherche : ${mandat.nom} ${mandat.prenoms}${mandat.budgetMax ? ' — Budget ' + mandat.budgetMax.toLocaleString('fr-FR') + ' €' : ''} (#${mandat.mandatId})`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Mailer] Erreur Resend mandat:", error);
      return false;
    }

    console.log(`[Mailer] Email mandat envoyé avec succès #${mandat.mandatId}`);
    return true;
  } catch (error) {
    console.error("[Mailer] Erreur lors de l'envoi mandat:", error);
    return false;
  }
}

// ─── HEXA — Notification nouveau dossier ─────────────────────────────────────

export type HexaEmailData = {
  nom: string;
  prenom: string;
  email: string;
  mobile?: string;
  montant: number;
  ville: string;
  dossierHexaId: number;
};

export async function sendNewHexaNotification(data: HexaEmailData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dashboardUrl = "https://www.sigmafactory.org/dashboard/hexa";

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #D4AF37; margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { color: #999; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #D4AF37; color: #000; font-weight: bold; padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 20px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .label { color: #666; }
    .value { color: #111; font-weight: 600; }
    .amount { font-size: 24px; font-weight: bold; color: #D4AF37; text-align: center; margin: 16px 0; }
    .cta { text-align: center; margin-top: 28px; }
    .cta a { background: #D4AF37; color: #000; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold; font-size: 14px; }
    .footer { background: #f9f9f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIGMA FACTORY</h1>
      <p>NOUVEAU DOSSIER CRÉDIT D'IMPÔT</p>
    </div>
    <div class="body">
      <span class="badge">Dossier #${data.dossierHexaId}</span>
      <div class="section">
        <h2>Informations client</h2>
        <div class="row"><span class="label">Nom :</span><span class="value">${data.nom} ${data.prenom}</span></div>
        <div class="row"><span class="label">Email :</span><span class="value">${data.email}</span></div>
        ${data.mobile ? `<div class="row"><span class="label">Mobile :</span><span class="value">${data.mobile}</span></div>` : ''}
        <div class="row"><span class="label">Ville :</span><span class="value">${data.ville}</span></div>
      </div>
      <div class="section">
        <h2>Montant demandé</h2>
        <div class="amount">${data.montant.toLocaleString('fr-FR')} €</div>
      </div>
      <div class="cta">
        <a href="${dashboardUrl}">Voir le dossier dans le dashboard</a>
      </div>
    </div>
    <div class="footer">Sigma Factory — Confidentiel — Ne pas transférer</div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: TEAM_EMAILS,
      subject: `Nouveau dossier Sigma Crédit — ${data.nom} ${data.prenom} — ${data.montant.toLocaleString('fr-FR')} € (#${data.dossierHexaId})`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Mailer] Erreur Resend hexa:", error);
      return false;
    }

    console.log(`[Mailer] Email hexa envoyé avec succès #${data.dossierHexaId}`);
    return true;
  } catch (error) {
    console.error("[Mailer] Erreur lors de l'envoi hexa:", error);
    return false;
  }
}

// ─── RAPPEL CALENDRIER ────────────────────────────────────────────────────────

const MEMBRE_EMAILS: Record<string, string> = {
  Maria:  "maria@sigmaipf.fr",
  Manon:  "manondubost@sigmaipf.fr",
  Elodie: "elodie@sigmafactory.fr",
  Hanna:  "assistance.direction@sigmaipf.fr",
  Marie:  "mariecabut@sigmaipf.fr",
};

export type CalendarReminderData = {
  taskId: number;
  titre: string;
  description?: string | null;
  assigneA: string;
  dateDebut: Date;
  rappelMinutesAvant: number;
};

export async function sendCalendarReminder(data: CalendarReminderData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const recipientEmail = MEMBRE_EMAILS[data.assigneA] ?? "contact@sigmafactory.fr";

    const dateStr = data.dateDebut.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
    });
    const timeStr = data.dateDebut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

    const rappelLabel = data.rappelMinutesAvant === 0
      ? "maintenant"
      : data.rappelMinutesAvant < 60
        ? `dans ${data.rappelMinutesAvant} minutes`
        : data.rappelMinutesAvant === 60
          ? "dans 1 heure"
          : data.rappelMinutesAvant === 1440
            ? "dans 1 jour"
            : `dans ${data.rappelMinutesAvant / 60}h`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:12px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory — Rappel</div>
      <div style="font-size:22px;font-weight:700;color:#000;margin-top:8px;">⏰ ${data.titre}</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Bonjour ${data.assigneA}, vous avez une tâche <strong style="color:#F0D080;">${rappelLabel}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#666;font-size:13px;width:40%;">Date</td>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#fff;font-size:13px;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#666;font-size:13px;">Heure</td>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#fff;font-size:13px;">${timeStr}</td>
        </tr>
        ${data.description ? `<tr>
          <td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top;">Notes</td>
          <td style="padding:10px 0;color:#aaa;font-size:13px;">${data.description}</td>
        </tr>` : ""}
      </table>
      <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #C9A84C;">
        <p style="color:#888;font-size:12px;margin:0;">Connectez-vous au <a href="https://www.sigmafactory.org/dashboard/calendar" style="color:#F0D080;">Calendrier Sigma</a> pour gérer vos tâches.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: [recipientEmail],
      subject: `⏰ Rappel : ${data.titre} — ${timeStr}`,
      html: htmlContent,
    });
    if (error) {
      console.error("[Mailer] Erreur rappel calendrier:", error);
      return false;
    }
    console.log(`[Mailer] Rappel calendrier envoyé à ${data.assigneA} (#${data.taskId})`);
    return true;
  } catch (error) {
    console.error("[Mailer] Erreur lors de l'envoi du rappel:", error);
    return false;
  }
}

// ─── ALERTE CRM PIPELINE ──────────────────────────────────────────────────────

const ETAPE_LABELS: Record<string, string> = {
  sigma_credit:      "Sigma Crédit",
  welcome_call:      "Welcome Call",
  point_personnalise:"Point Personnalisé",
  courtage:          "Courtage",
  recherche_bien:    "Recherche bien",
};

const ETAPE_RESPONSABLE: Record<string, string> = {
  sigma_credit:      "Hanna",
  welcome_call:      "Maria",
  point_personnalise:"Maria",
  courtage:          "Manon",
  recherche_bien:    "Elodie",
};

function buildEmailHtml(opts: {
  badgeText: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  ctaUrl: string;
  ctaLabel: string;
  secondCtaUrl?: string;
  secondCtaLabel?: string;
}): string {
  const badge = opts.badgeColor ?? "#D4AF37";
  // Rend les URLs cliquables dans les valeurs de champs
  const renderValue = (value: string) => {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return `<a href="${value}" style="color:#D4AF37;word-break:break-all;">${value}</a>`;
    }
    return value;
  };
  const fieldsHtml = opts.fields.map(f => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;vertical-align:top;">${f.label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${renderValue(f.value)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory — Pipeline</div>
      <div style="font-size:20px;font-weight:700;color:#000;margin-top:6px;">${opts.title}</div>
    </div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:${badge};color:#000;font-weight:bold;font-size:11px;padding:3px 12px;border-radius:20px;margin-bottom:20px;">${opts.badgeText}</span>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">${opts.subtitle}</p>
      <table style="width:100%;border-collapse:collapse;">${fieldsHtml}</table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${opts.ctaUrl}" style="background:#D4AF37;color:#000;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">${opts.ctaLabel}</a>
        ${opts.secondCtaUrl && opts.secondCtaLabel ? `<br><br><a href="${opts.secondCtaUrl}" style="background:transparent;color:#D4AF37;text-decoration:none;padding:11px 24px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;border:2px solid #D4AF37;">${opts.secondCtaLabel}</a>` : ""}
      </div>
    </div>
    <div style="background:#0d0d0d;padding:14px 32px;text-align:center;font-size:11px;color:#444;border-top:1px solid #1e1e1e;">
      Sigma Factory — <a href="https://www.sigmafactory.org" style="color:#666;text-decoration:none;">sigmafactory.org</a><br>
      <span style="font-size:10px;color:#333;">Conformément au RGPD, vos données sont traitées uniquement dans le cadre de votre relation avec Sigma Factory.<br>Pour exercer vos droits (accès, rectification, suppression) : <a href="mailto:contact@sigmafactory.fr" style="color:#555;">contact@sigmafactory.fr</a></span>
    </div>
  </div>
</body>
</html>`;
}

export type CrmLeadAlertData = {
  leadId: number;
  nom: string;
  prenom: string;
  email: string;
  etape: string;
  statut?: string;
  action: "nouveau_lead" | "changement_etape" | "nouvelle_note";
  noteContenu?: string;
  noteAuteur?: string;
  ancienneEtape?: string;
};

export async function sendCrmLeadAlert(data: CrmLeadAlertData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const pipelineUrl = "https://www.sigmafactory.org/dashboard/pipeline";

    const responsable = ETAPE_RESPONSABLE[data.etape] ?? "Équipe";
    const responsableEmails = ROLE_EMAILS[responsable] ?? [];
    const to = Array.from(new Set([...responsableEmails, ...OWNER_EMAILS]));

    let subject = "";
    let badgeText = "";
    let title = "";
    let subtitle = "";
    let fields: { label: string; value: string }[] = [];

    if (data.action === "nouveau_lead") {
      subject = `🆕 Nouveau lead Pipeline : ${data.prenom} ${data.nom}`;
      badgeText = "Nouveau lead";
      title = `${data.prenom} ${data.nom} a rejoint le pipeline`;
      subtitle = `Un nouveau lead vient d'être ajouté à l'étape <strong style="color:#F0D080;">${ETAPE_LABELS[data.etape] ?? data.etape}</strong>.`;
      fields = [
        { label: "Nom complet", value: `${data.prenom} ${data.nom}` },
        { label: "Email", value: data.email },
        { label: "Étape", value: ETAPE_LABELS[data.etape] ?? data.etape },
        { label: "Responsable", value: responsable },
      ];
    } else if (data.action === "changement_etape") {
      subject = `🔄 Lead déplacé : ${data.prenom} ${data.nom} → ${ETAPE_LABELS[data.etape] ?? data.etape}`;
      badgeText = "Changement d'étape";
      title = `${data.prenom} ${data.nom} — Nouvelle étape`;
      subtitle = `Le lead a été déplacé vers <strong style="color:#F0D080;">${ETAPE_LABELS[data.etape] ?? data.etape}</strong>.`;
      fields = [
        { label: "Lead", value: `${data.prenom} ${data.nom}` },
        { label: "Ancienne étape", value: data.ancienneEtape ? (ETAPE_LABELS[data.ancienneEtape] ?? data.ancienneEtape) : "—" },
        { label: "Nouvelle étape", value: ETAPE_LABELS[data.etape] ?? data.etape },
        { label: "Responsable", value: responsable },
      ];
    } else if (data.action === "nouvelle_note") {
      subject = `📝 Nouvelle note sur ${data.prenom} ${data.nom}`;
      badgeText = "Nouvelle note";
      title = `Note ajoutée sur ${data.prenom} ${data.nom}`;
      subtitle = `Une note a été ajoutée par <strong style="color:#F0D080;">${data.noteAuteur ?? "l'équipe"}</strong>.`;
      fields = [
        { label: "Lead", value: `${data.prenom} ${data.nom}` },
        { label: "Étape", value: ETAPE_LABELS[data.etape] ?? data.etape },
        { label: "Auteur", value: data.noteAuteur ?? "—" },
        { label: "Note", value: data.noteContenu ?? "—" },
      ];
    }

    const html = buildEmailHtml({
      badgeText,
      title,
      subtitle,
      fields,
      ctaUrl: pipelineUrl,
      ctaLabel: "Voir le Pipeline",
    });

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Mailer] Erreur alerte CRM:", error);
      return false;
    }
    console.log(`[Mailer] Alerte CRM envoyée (${data.action}) pour ${data.prenom} ${data.nom}`);
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur alerte CRM:", err);
    return false;
  }
}

// ─── ALERTE CALENDRIER — Nouvelle tâche assignée ──────────────────────────────

export type CalendarTaskAlertData = {
  taskId: number;
  titre: string;
  description?: string | null;
  assigneA: string;
  dateDebut: Date;
  dateFin?: Date | null;
  creePar?: string | null;
};

export async function sendCalendarTaskAlert(data: CalendarTaskAlertData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const calendarUrl = "https://www.sigmafactory.org/dashboard/calendar";

    const recipientEmail = MEMBRE_EMAILS[data.assigneA] ?? "contact@sigmafactory.fr";
    const to = Array.from(new Set([recipientEmail, ...OWNER_EMAILS]));

    const dateStr = data.dateDebut.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
    });
    const timeStr = data.dateDebut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

    const html = buildEmailHtml({
      badgeText: "Nouvelle tâche",
      badgeColor: "#3b82f6",
      title: `📅 ${data.titre}`,
      subtitle: `Une nouvelle tâche vous a été assignée par <strong style="color:#F0D080;">${data.creePar ?? "l'équipe"}</strong>.`,
      fields: [
        { label: "Assigné à", value: data.assigneA },
        { label: "Date", value: dateStr },
        { label: "Heure", value: timeStr },
        ...(data.description ? [{ label: "Description", value: data.description }] : []),
      ],
      ctaUrl: calendarUrl,
      ctaLabel: "Voir le Calendrier",
    });

    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to,
      subject: `📅 Nouvelle tâche : ${data.titre} — ${dateStr}`,
      html,
    });

    if (error) {
      console.error("[Mailer] Erreur alerte calendrier:", error);
      return false;
    }
    console.log(`[Mailer] Alerte calendrier envoyée à ${data.assigneA} (#${data.taskId})`);
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur alerte calendrier:", err);
    return false;
  }
}

// ─── CALENDRIER — Tâche marquée terminée ────────────────────────────────────

export async function sendTacheTermineeNotif(data: {
  titre: string;
  assigneA: string;
  dateDebut: Date;
  creePar?: string | null;
  destinataireEmail: string;
  destinataireNom: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dateStr = data.dateDebut.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
    });
    const html = buildEmailHtml({
      badgeText: "Tâche terminée",
      badgeColor: "#22c55e",
      title: `✅ ${data.titre}`,
      subtitle: `Votre demande a été traitée par <strong style="color:#F0D080;">${data.assigneA}</strong>.`,
      fields: [
        { label: "Demande", value: data.titre },
        { label: "Traitée par", value: data.assigneA },
        { label: "Date initiale", value: dateStr },
      ],
      ctaUrl: "https://www.sigmafactory.org",
      ctaLabel: "Retour sur Sigma Factory",
    });
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: [data.destinataireEmail],
      subject: `✅ Votre demande "${data.titre}" a été traitée`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur notif tâche terminée:", error); return false; }
    console.log(`[Mailer] Notif tâche terminée envoyée à ${data.destinataireEmail}`);
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur notif tâche terminée:", err);
    return false;
  }
}

// ─── CUSTOM CARE — DOCUMENT PARTAGÉ ──────────────────────────────────────────

export type DemandeDocumentAlertData = {
  demandeId: number;
  demandeNom: string;
  demandeEmail: string;
  demandeSujet: string;
  nomFichier: string;
  envoyePar: "lead" | "hanna";
  dashboardUrl?: string;
};

export async function sendDemandeDocumentAlert(data: DemandeDocumentAlertData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dashboardUrl = data.dashboardUrl ?? "https://www.sigmafactory.org/dashboard/customcare";

    if (data.envoyePar === "lead") {
      // Notifier Hanna qu'un lead a joint un document
      const to = Array.from(new Set([...ROLE_EMAILS["Hanna"], ...OWNER_EMAILS]));
      const html = buildEmailHtml({
        badgeText: "📎 Nouveau document",
        badgeColor: "#C9A84C",
        title: "Document joint par un lead",
        subtitle: `<strong style="color:#F0D080;">${data.demandeNom}</strong> a joint un fichier à sa demande Custom Care.`,
        fields: [
          { label: "Lead", value: `${data.demandeNom} (${data.demandeEmail})` },
          { label: "Sujet", value: data.demandeSujet },
          { label: "Fichier", value: data.nomFichier },
        ],
        ctaUrl: dashboardUrl,
        ctaLabel: "Voir la demande",
      });
      const { error } = await resend.emails.send({
        from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
        to,
        subject: `📎 Nouveau document — ${data.demandeSujet} (${data.demandeNom})`,
        html,
      });
      if (error) { console.error("[Mailer] Erreur doc alert:", error); return false; }
      return true;
    } else {
      // Notifier le lead qu'Hanna lui a envoyé un document
      const to = [data.demandeEmail, ...OWNER_EMAILS];
      const html = buildEmailHtml({
        badgeText: "📄 Document de Sigma Factory",
        badgeColor: "#C9A84C",
        title: "Un document vous a été envoyé",
        subtitle: `L'équipe Sigma Factory vous a transmis un document concernant votre demande.`,
        fields: [
          { label: "Sujet", value: data.demandeSujet },
          { label: "Fichier", value: data.nomFichier },
        ],
        ctaUrl: dashboardUrl,
        ctaLabel: "Accéder à votre espace",
      });
      const { error } = await resend.emails.send({
        from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
        to,
        subject: `📄 Document Sigma Factory — ${data.demandeSujet}`,
        html,
      });
      if (error) { console.error("[Mailer] Erreur doc alert lead:", error); return false; }
      return true;
    }
  } catch (err) {
    console.error("[Mailer] Erreur sendDemandeDocumentAlert:", err);
    return false;
  }
}

// ─── DOCUMENTS COURTIER ↔ MANON ───────────────────────────────────────────────

export type PartnerDocumentAlertData = {
  partnerNom: string;
  partnerEmail: string;
  nomFichier: string;
  envoyePar: "courtier" | "manon" | "agent" | "elodie";
  dashboardUrl?: string;
};

export async function sendCourtierDocumentAlert(data: PartnerDocumentAlertData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    if (data.envoyePar === "courtier") {
      const to = Array.from(new Set([...(ROLE_EMAILS["Manon"] ?? []), ...OWNER_EMAILS]));
      const html = buildEmailHtml({
        badgeText: "📎 Document courtier",
        badgeColor: "#C9A84C",
        title: "Document envoyé par un courtier",
        subtitle: `<strong style="color:#F0D080;">${data.partnerNom}</strong> vous a transmis un document.`,
        fields: [
          { label: "Courtier", value: `${data.partnerNom} (${data.partnerEmail})` },
          { label: "Fichier", value: data.nomFichier },
        ],
        ctaUrl: data.dashboardUrl ?? "https://www.sigmafactory.org/courtiers",
        ctaLabel: "Voir le dossier courtier",
      });
      const { error } = await resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `📎 Document de ${data.partnerNom} — Courtage`, html });
      if (error) { console.error("[Mailer] Erreur courtier doc:", error); return false; }
      return true;
    } else {
      const to = [data.partnerEmail, ...OWNER_EMAILS];
      const html = buildEmailHtml({
        badgeText: "📄 Document de Sigma Factory",
        badgeColor: "#C9A84C",
        title: "Un document vous a été envoyé",
        subtitle: `L'équipe Sigma Factory (Manon) vous a transmis un document.`,
        fields: [{ label: "Fichier", value: data.nomFichier }],
        ctaUrl: data.dashboardUrl ?? "https://www.sigmafactory.org/portail",
        ctaLabel: "Accéder à votre espace",
      });
      const { error } = await resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `📄 Document Sigma Factory — Courtage`, html });
      if (error) { console.error("[Mailer] Erreur courtier doc manon:", error); return false; }
      return true;
    }
  } catch (err) {
    console.error("[Mailer] Erreur sendCourtierDocumentAlert:", err);
    return false;
  }
}

// ─── DOCUMENTS AGENT ↔ ÉLODIE ─────────────────────────────────────────────────

export async function sendAgentDocumentAlert(data: PartnerDocumentAlertData): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    if (data.envoyePar === "agent") {
      const to = Array.from(new Set([...(ROLE_EMAILS["Elodie"] ?? []), ...OWNER_EMAILS]));
      const html = buildEmailHtml({
        badgeText: "📎 Document agent immo",
        badgeColor: "#C9A84C",
        title: "Document envoyé par un agent",
        subtitle: `<strong style="color:#F0D080;">${data.partnerNom}</strong> vous a transmis un document.`,
        fields: [
          { label: "Agent", value: `${data.partnerNom} (${data.partnerEmail})` },
          { label: "Fichier", value: data.nomFichier },
        ],
        ctaUrl: data.dashboardUrl ?? "https://www.sigmafactory.org/reseau",
        ctaLabel: "Voir le dossier agent",
      });
      const { error } = await resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `📎 Document de ${data.partnerNom} — Réseau Immo`, html });
      if (error) { console.error("[Mailer] Erreur agent doc:", error); return false; }
      return true;
    } else {
      const to = [data.partnerEmail, ...OWNER_EMAILS];
      const html = buildEmailHtml({
        badgeText: "📄 Document de Sigma Factory",
        badgeColor: "#C9A84C",
        title: "Un document vous a été envoyé",
        subtitle: `L'équipe Sigma Factory (Élodie) vous a transmis un document.`,
        fields: [{ label: "Fichier", value: data.nomFichier }],
        ctaUrl: data.dashboardUrl ?? "https://www.sigmafactory.org/portail",
        ctaLabel: "Accéder à votre espace",
      });
      const { error } = await resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `📄 Document Sigma Factory — Réseau Immo`, html });
      if (error) { console.error("[Mailer] Erreur agent doc elodie:", error); return false; }
      return true;
    }
  } catch (err) {
    console.error("[Mailer] Erreur sendAgentDocumentAlert:", err);
    return false;
  }
}


// ─── NOUVEL AMBASSADEUR (notif équipe) ────────────────────────────────────────
export async function sendNouvelAmbassadeurNotif(data: {
  prenom: string; nom: string; email: string; telephone: string;
  ville: string; statut: string; niveau: string; codeParrain?: string;
  parrainNom?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: `Niveau ${data.niveau}`,
      badgeColor: "#4A90D9",
      title: `Nouvel agent : ${data.prenom} ${data.nom}`,
      subtitle: `Un nouvel agent vient de rejoindre le réseau Sigma Factory.`,
      fields: [
        { label: "Nom", value: `${data.prenom} ${data.nom}` },
        { label: "Email", value: data.email },
        { label: "Téléphone", value: data.telephone },
        { label: "Ville", value: data.ville },
        { label: "Statut", value: data.statut.replace(/_/g, " ") },
        { label: "Niveau", value: `Niveau ${data.niveau}` },
        ...(data.parrainNom ? [{ label: "Parrain", value: data.parrainNom }] : []),
        ...(data.codeParrain ? [{ label: "Code parrain", value: data.codeParrain }] : []),
      ],
      ctaUrl: "https://www.sigmafactory.org/reseau",
      ctaLabel: "Voir le réseau ambassadeurs",
    });
    const recipients = ["elodie@sigmafactory.fr", "contact@sigmafactory.fr"];
    const results = await Promise.all(recipients.map(to =>
      resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `Nouvel agent : ${data.prenom} ${data.nom}`, html })
    ));
    return results.every(r => !r.error);
  } catch (err) {
    console.error("[Mailer] Erreur sendNouvelAmbassadeurNotif:", err);
    return false;
  }
}

// ─── NOUVEAU COURTIER (notif équipe) ─────────────────────────────────────────
export async function sendNouveauCourtierNotif(data: {
  prenom: string; nom: string; email: string; telephone: string;
  ville: string; statut: string; cabinetNom?: string; numeroOrias?: string;
  codeParrain?: string; parrainNom?: string; parrainEmail?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: "Nouveau courtier",
      badgeColor: "#D4AF37",
      title: `Nouveau courtier : ${data.prenom} ${data.nom}`,
      subtitle: `Un nouveau courtier vient de rejoindre le réseau Sigma Factory.`,
      fields: [
        { label: "Nom", value: `${data.prenom} ${data.nom}` },
        { label: "Email", value: data.email },
        { label: "Téléphone", value: data.telephone },
        { label: "Ville", value: data.ville },
        { label: "Statut juridique", value: data.statut.replace(/_/g, " ") },
        ...(data.cabinetNom ? [{ label: "Cabinet", value: data.cabinetNom }] : []),
        ...(data.numeroOrias ? [{ label: "N° ORIAS", value: data.numeroOrias }] : []),
        ...(data.parrainNom ? [{ label: "Parrain", value: data.parrainNom }] : []),
        ...(data.codeParrain ? [{ label: "Code parrain", value: data.codeParrain }] : []),
      ],
      ctaUrl: "https://www.sigmafactory.org/courtiers",
      ctaLabel: "Voir le réseau courtiers",
    });
    // Destinataires fixes : Manon + Owner
    const recipients = ["manondubost@sigmaipf.fr", "contact@sigmafactory.fr"];
    // Notifier le parrain s'il a un email distinct
    if (data.parrainEmail && !recipients.includes(data.parrainEmail.toLowerCase())) {
      recipients.push(data.parrainEmail.toLowerCase());
    }
    const results = await Promise.all(recipients.map(to =>
      resend.emails.send({ from: "Sigma Factory <noreply@fa.sigma-factory.fr>", to, subject: `🎉 Nouveau filleul courtier : ${data.prenom} ${data.nom}`, html })
    ));
    return results.every(r => !r.error);
  } catch (err) {
    console.error("[Mailer] Erreur sendNouveauCourtierNotif:", err);
    return false;
  }
}

// ─── EMAIL DE BIENVENUE AMBASSADEUR ───────────────────────────────────────────
export async function sendBienvenueAmbassadeur(data: {
  prenom: string; nom: string; email: string;
  codeParrain: string; portailUrl: string; contratUrl?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: "Bienvenue !",
      badgeColor: "#22c55e",
      title: `Bienvenue dans le réseau Sigma Factory, ${data.prenom} !`,
      subtitle: `Votre inscription en tant qu'agent immobilier a bien été enregistrée. Voici toutes vos informations d'accès.`,
      fields: [
        { label: "Votre email de connexion", value: data.email },
        { label: "Première étape", value: `Cliquez sur le bouton ci-dessous pour créer votre compte avec l'adresse ${data.email}. Vous choisirez votre mot de passe lors de l'inscription.` },
        { label: "Votre code parrain unique", value: data.codeParrain },
        { label: "Votre lien de parrainage", value: `https://www.sigmafactory.org/parrainage/${data.codeParrain}` },
      ],
      ctaUrl: "https://www.sigmafactory.org/register",
      ctaLabel: "Créer mon compte",
      ...(data.contratUrl ? { secondCtaUrl: data.contratUrl, secondCtaLabel: "📄 Télécharger mon contrat (PDF)" } : {}),
    });
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.email,
      subject: `Bienvenue dans le réseau Sigma Factory — ${data.prenom} ${data.nom}`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur bienvenue ambassadeur:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendBienvenueAmbassadeur:", err);
    return false;
  }
}

// ─── EMAIL DE BIENVENUE COURTIER ──────────────────────────────────────────────
export async function sendBienvenueCourtier(data: {
  prenom: string; nom: string; email: string;
  codeParrain: string; portailUrl: string; conventionUrl?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: "Bienvenue !",
      badgeColor: "#22c55e",
      title: `Bienvenue dans le réseau Sigma Factory, ${data.prenom} !`,
      subtitle: `Votre convention en tant que courtier partenaire a bien été enregistrée. Voici toutes vos informations d'accès.`,
      fields: [
        { label: "Votre email de connexion", value: data.email },
        { label: "Première étape", value: `Cliquez sur le bouton ci-dessous pour créer votre compte avec l'adresse ${data.email}. Vous choisirez votre mot de passe lors de l'inscription.` },
        { label: "Votre code parrain unique", value: data.codeParrain },
        { label: "Votre lien de parrainage", value: `https://www.sigmafactory.org/parrainage/${data.codeParrain}` },
      ],
      ctaUrl: "https://www.sigmafactory.org/register",
      ctaLabel: "Créer mon compte",
      ...(data.conventionUrl ? { secondCtaUrl: data.conventionUrl, secondCtaLabel: "📄 Télécharger ma convention (PDF)" } : {}),
    });
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.email,
      subject: `Bienvenue dans le réseau Sigma Factory — ${data.prenom} ${data.nom}`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur bienvenue courtier:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendBienvenueCourtier:", err);
    return false;
  }
}

// ─── EMAIL CONFIRMATION RDV ───────────────────────────────────────────────────

export async function sendRdvConfirmation(data: {
  nomLead: string;
  emailLead: string;
  typeRdv: string;
  dateDebut: Date;
  dateFin: Date;
  message?: string;
}): Promise<boolean> {
  const dateStr = data.dateDebut.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
  });
  const heureDebut = data.dateDebut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const heureFin = data.dateFin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const isPointImmo = data.typeRdv === "Point Immobilier" || data.typeRdv === "point_immobilier";
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlLead = buildRdvEmailLead(data.nomLead, data.emailLead, data.typeRdv, dateStr, heureDebut, heureFin, data.message);
    // Email de confirmation au lead
    await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.emailLead,
      subject: `Confirmation RDV — ${data.typeRdv} · ${dateStr}`,
      html: htmlLead,
    });
    if (isPointImmo) {
      // Notification email à Élodie pour les RDV Point Immobilier
      const htmlElodie = buildRdvEmailElodie(data.nomLead, data.emailLead, dateStr, heureDebut, heureFin, data.message);
      await resend.emails.send({
        from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
        to: "elodie@sigmafactory.fr",
        subject: `🏠 Nouveau RDV Point Immobilier — ${data.nomLead} le ${dateStr} à ${heureDebut}`,
        html: htmlElodie,
      });
      // Copie direction
      await resend.emails.send({
        from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
        to: "contact@sigmafactory.fr",
        subject: `[Immo] Nouveau RDV Point Immobilier — ${data.nomLead} le ${dateStr} à ${heureDebut}`,
        html: htmlElodie,
      });
    } else {
      // Email d'alerte à Maria pour les autres types de RDV
      const htmlMaria = buildRdvEmailMaria(data.nomLead, data.emailLead, data.typeRdv, dateStr, heureDebut, heureFin, data.message);
      await resend.emails.send({
        from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
        to: "maria@sigmaipf.fr",
        subject: `Nouveau RDV : ${data.typeRdv} — ${data.nomLead} le ${dateStr} a ${heureDebut}`,
        html: htmlMaria,
      });
    }
    return true;
  } catch (e) {
    console.error("[Mailer] sendRdvConfirmation error:", e);
    return false;
  }
}

function buildRdvEmailElodie(nom: string, email: string, date: string, hd: string, hf: string, msg?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pôle Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#C9A84C">🏠 Nouveau RDV Point Immobilier</h2><p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px">Bonjour Élodie,<br><br>Un lead vient de prendre un <strong style="color:#fff">Point Immobilier</strong> dans ton agenda.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:20px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Détails du RDV</div><div style="margin-bottom:8px"><span style="color:#888;font-size:12px">Lead :</span> <span style="color:#fff;font-weight:bold">${nom}</span></div><div style="margin-bottom:8px"><span style="color:#888;font-size:12px">Email :</span> <span style="color:#C9A84C">${email}</span></div><div style="margin-bottom:8px"><span style="color:#888;font-size:12px">Date :</span> <span style="color:#fff;font-weight:bold">${date}</span></div><div style="margin-bottom:8px"><span style="color:#888;font-size:12px">Heure :</span> <span style="color:#fff;font-weight:bold">${hd} – ${hf}</span></div>${msg ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #333"><span style="color:#888;font-size:12px">Message du lead :</span><div style="color:#aaa;font-size:13px;margin-top:6px">${msg}</div></div>` : ""}</div><div style="text-align:center;margin:28px 0"><a href="https://www.sigmafactory.org/dashboard/calendar" style="background:#C9A84C;color:#000;text-decoration:none;padding:14px 32px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">VOIR MON AGENDA</a></div><p style="color:#555;font-size:12px">Ce RDV a été automatiquement ajouté à ton calendrier dans l'App.</p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center">Sigma Factory — Pôle Immobilier</div></div></body></html>`;
}

function buildRdvEmailLead(nom: string, email: string, type: string, date: string, hd: string, hf: string, msg?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div></div><div style="padding:36px"><h2 style="margin:0 0 6px">Votre rendez-vous est confirme !</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px">${type}</p><p style="color:#aaa;font-size:14px;line-height:1.6">Bonjour ${nom},<br><br>Votre rendez-vous avec Maria a bien ete enregistre.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:18px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Date &amp; Heure</div><div style="color:#fff;font-size:15px;font-weight:bold">${date}</div><div style="color:#C9A84C;font-size:14px;margin-top:4px">${hd} - ${hf}</div></div><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:18px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Type de rendez-vous</div><div style="color:#fff;font-size:15px;font-weight:bold">${type}</div></div>${msg ? `<div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:18px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre message</div><div style="color:#aaa;font-size:13px">${msg}</div></div>` : ""}<p style="color:#666;font-size:13px">En cas d'empechement : <a href="mailto:contact@sigmafactory.fr" style="color:#C9A84C">contact@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#555;font-size:10px;text-align:center">Sigma Factory — <a href="https://www.sigmafactory.org" style="color:#666;text-decoration:none;">sigmafactory.org</a><br><span style="color:#444;">Conformément au RGPD, vos données sont traitées uniquement dans le cadre de votre relation avec Sigma Factory. Pour exercer vos droits : <a href="mailto:contact@sigmafactory.fr" style="color:#555;">contact@sigmafactory.fr</a></span></div></div></body></html>`;
}

// ─── NOTIFICATION CHANGEMENT STATUT CUSTOMER CARE ───────────────────────────────────────────────
export async function sendDemandeStatutChange(data: {
  demandeId: number;
  nom: string;
  prenom: string;
  sujet: string;
  ancienStatut: string;
  nouveauStatut: string;
  notesInternes?: string;
  destinataireEmail: string;
  destinataireNom: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const statutLabels: Record<string, string> = {
      nouvelle: "Nouvelle",
      en_cours: "En cours de traitement",
      en_attente_retour: "En attente de votre retour",
      standby: "En standby",
      effectuee: "Effectuee",
      annulee: "Annulee",
    };
    const nouveauLabel = statutLabels[data.nouveauStatut] ?? data.nouveauStatut;
    const ancienLabel = statutLabels[data.ancienStatut] ?? data.ancienStatut;
    const isUrgent = data.nouveauStatut === "en_attente_retour";
    const accentColor = isUrgent ? "#f59e0b" : "#C9A84C";
    const notesBlock = data.notesInternes
      ? `<div style="background:#0a0a0a;border-left:3px solid ${accentColor};padding:14px 18px;margin:0 0 20px"><p style="color:${accentColor};font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Message de Hanna</p><p style="color:#ddd;font-size:14px;line-height:1.6;margin:0">${data.notesInternes.replace(/\n/g, "<br>")}</p></div>`
      : "";
    const urgentBlock = isUrgent
      ? `<div style="background:#f59e0b15;border:1px solid #f59e0b44;padding:14px 18px;margin:0 0 20px"><p style="color:#f59e0b;font-size:13px;font-weight:bold;margin:0">Action requise de votre part</p><p style="color:#f59e0b99;font-size:12px;margin:6px 0 0">Hanna attend votre retour. Merci de repondre des que possible.</p></div>`
      : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Georgia,serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:24px 32px;border-bottom:2px solid ${accentColor}"><div style="font-size:18px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:${accentColor}">FACTORY</span></div><p style="color:#888;font-size:11px;margin:4px 0 0;letter-spacing:1px">CUSTOMER CARE - MISE A JOUR</p></div><div style="padding:32px"><h2 style="color:#fff;font-size:17px;margin:0 0 6px">Bonjour ${data.destinataireNom},</h2><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px">Hanna a mis a jour le statut de votre demande <strong style="color:#fff">#${data.demandeId}</strong>.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.25);padding:16px 20px;margin:0 0 16px"><p style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px">Sujet</p><p style="color:#fff;font-size:15px;font-weight:bold;margin:0">${data.sujet}</p></div><div style="margin:0 0 16px"><div style="background:#0a0a0a;border:1px solid #222;padding:12px 16px;margin-bottom:8px"><p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Ancien statut</p><p style="color:#aaa;font-size:13px;margin:0">${ancienLabel}</p></div><div style="background:#0a0a0a;border:1px solid ${accentColor}55;padding:12px 16px"><p style="color:${accentColor};font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Nouveau statut</p><p style="color:#fff;font-size:13px;font-weight:bold;margin:0">${nouveauLabel}</p></div></div>${notesBlock}${urgentBlock}<p style="color:#666;font-size:12px;border-top:1px solid #222;padding-top:16px;margin-top:24px">Pour toute question : <a href="mailto:assistance.direction@sigmaipf.fr" style="color:${accentColor}">assistance.direction@sigmaipf.fr</a></p></div><div style="background:#000;padding:14px 32px;text-align:center;border-top:1px solid #1a1a1a"><p style="color:#555;font-size:10px;margin:0;letter-spacing:1px">SIGMA FACTORY - Customer Care - Demande #${data.demandeId}</p></div></div></body></html>`;
    await resend.emails.send({
      from: "Sigma Factory Customer Care <noreply@fa.sigma-factory.fr>",
      to: data.destinataireEmail,
      cc: ["contact@sigmafactory.fr"],
      subject: `[Customer Care #${data.demandeId}] ${nouveauLabel} - ${data.sujet}`,
      html,
    });
    return true;
  } catch (e) {
    console.error("[Mailer] sendDemandeStatutChange error:", e);
    return false;
  }
}

function buildRdvEmailMaria(nom: string, email: string, type: string, date: string, hd: string, hf: string, msg?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div></div><div style="padding:36px"><h2 style="margin:0 0 6px">Nouveau RDV — ${type}</h2><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:14px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Lead</div><div style="color:#fff;font-size:14px">${nom}</div><div style="color:#C9A84C;font-size:12px;margin-top:2px">${email}</div></div><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:14px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Date &amp; Heure</div><div style="color:#fff;font-size:14px">${date} · ${hd} - ${hf}</div></div><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:14px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Type</div><div style="color:#fff;font-size:14px">${type}</div></div>${msg ? `<div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:14px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Message</div><div style="color:#aaa;font-size:13px">${msg}</div></div>` : ""}<a href="https://www.sigmafactory.org/dashboard/calendar" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px;margin:24px 0">VOIR LE CALENDRIER</a></div><div style="padding:20px 36px;border-top:1px solid #222;color:#555;font-size:11px">Sigma Factory — Alerte interne</div></div></body></html>`;
}

// ─── EMAIL DE BIENVENUE ───────────────────────────────────────────────────────
export async function sendBienvenueAcces(data: {
  destinataireEmail: string;
  destinataireNom: string;
  role: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const roleLabels: Record<string, string> = {
      user: "Utilisateur",
      agent: "Agent immobilier",
      direction: "Direction",
      admin: "Administrateur",
    };
    const roleLabel = roleLabels[data.role] ?? "Utilisateur";
    const registerUrl = "https://www.sigmafactory.org/register";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;background:#111"><div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:#C9A84C">FACTORY</span></div></div><div style="padding:32px"><h2 style="color:#fff;margin:0 0 8px">Bienvenue, ${data.destinataireNom} !</h2><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px">Ton acces a la plateforme <strong style="color:#fff">Sigma Factory</strong> a ete active. Tu peux maintenant creer ton compte en cliquant sur le bouton ci-dessous.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:16px 20px;margin:0 0 24px"><p style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px">Ton role</p><p style="color:#C9A84C;font-size:15px;font-weight:bold;margin:0">${roleLabel}</p></div><a href="${registerUrl}" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px;margin:0 0 20px">CREER MON COMPTE</a><p style="color:#555;font-size:12px;line-height:1.6;margin:0">Utilise l'adresse email <strong style="color:#aaa">${data.destinataireEmail}</strong> pour t'inscrire.<br>Pour toute question : <a href="mailto:assistance.direction@sigmaipf.fr" style="color:#C9A84C">assistance.direction@sigmaipf.fr</a></p></div><div style="padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;text-align:center">Sigma Factory - Acces reserve a l'equipe interne</div></div></body></html>`;
    await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.destinataireEmail,
      subject: "Ton acces Sigma Factory est active !",
      html,
    });
    console.log("[Mailer] Email de bienvenue envoye a", data.destinataireEmail);
    return true;
  } catch (e) {
    console.error("[Mailer] sendBienvenueAcces error:", e);
    return false;
  }
}

export async function sendNouveauFilleulNotif(data: {
  parrainPrenom: string; parrainEmail: string;
  filleulPrenom: string; filleulNom: string;
  filleulStatut: string; filleulVille: string;
  type: "agent" | "courtier";
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const typeLabel = data.type === "agent" ? "agent immobilier" : "courtier";
    const html = buildEmailHtml({
      badgeText: `Nouveau filleul ${typeLabel}`,
      badgeColor: "#D4AF37",
      title: `🎉 Nouveau filleul : ${data.filleulPrenom} ${data.filleulNom}`,
      subtitle: `Un nouveau ${typeLabel} vient de rejoindre le réseau Sigma Factory grâce à votre parrainage.`,
      fields: [
        { label: "Prénom", value: data.filleulPrenom },
        { label: "Nom", value: data.filleulNom },
        { label: "Statut", value: data.filleulStatut.replace(/_/g, " ") },
        { label: "Ville", value: data.filleulVille },
      ],
      ctaUrl: "https://www.sigmafactory.org/portail",
      ctaLabel: "Voir mon espace parrain",
    });
    const result = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.parrainEmail,
      subject: `🎉 Nouveau filleul ${typeLabel} : ${data.filleulPrenom} ${data.filleulNom}`,
      html,
    });
    return !result.error;
  } catch (err) {
    console.error("[Mailer] Erreur sendNouveauFilleulNotif:", err);
    return false;
  }
}

export async function sendBienvenueCourtierAvecMdp(data: {
  prenom: string; nom: string; email: string;
  codeParrain: string; portailUrl: string; tempPassword: string; conventionUrl?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: "Bienvenue !",
      badgeColor: "#22c55e",
      title: `Bienvenue dans le réseau Sigma Factory, ${data.prenom} !`,
      subtitle: `Votre convention en tant que courtier partenaire a bien été enregistrée. Voici vos identifiants de connexion.`,
      fields: [
        { label: "Votre email de connexion", value: data.email },
        { label: "Votre mot de passe temporaire", value: data.tempPassword },
        { label: "Important", value: "Connectez-vous et changez votre mot de passe dès votre première connexion." },
        { label: "Votre code parrain unique", value: data.codeParrain },
        { label: "Votre lien de parrainage", value: `https://www.sigmafactory.org/parrainage/${data.codeParrain}` },
      ],
      ctaUrl: data.portailUrl,
      ctaLabel: "Accéder à mon espace courtier",
      ...(data.conventionUrl ? { secondCtaUrl: data.conventionUrl, secondCtaLabel: "📄 Télécharger ma convention (PDF)" } : {}),
    });
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.email,
      subject: `Bienvenue dans le réseau Sigma Factory — ${data.prenom} ${data.nom}`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur bienvenue courtier avec mdp:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendBienvenueCourtierAvecMdp:", err);
    return false;
  }
}

export async function sendBienvenueAmbassadeurAvecMdp(data: {
  prenom: string; nom: string; email: string;
  codeParrain: string; portailUrl: string; tempPassword: string; conventionUrl?: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildEmailHtml({
      badgeText: "Bienvenue !",
      badgeColor: "#22c55e",
      title: `Bienvenue dans le réseau Sigma Factory, ${data.prenom} !`,
      subtitle: `Votre convention en tant qu'agent immobilier partenaire a bien été enregistrée. Voici vos identifiants de connexion.`,
      fields: [
        { label: "Votre email de connexion", value: data.email },
        { label: "Votre mot de passe temporaire", value: data.tempPassword },
        { label: "Important", value: "Connectez-vous et changez votre mot de passe dès votre première connexion." },
        { label: "Votre code parrain unique", value: data.codeParrain },
        { label: "Votre lien de parrainage", value: `https://www.sigmafactory.org/parrainage/${data.codeParrain}` },
      ],
      ctaUrl: data.portailUrl,
      ctaLabel: "Accéder à mon espace agent",
      ...(data.conventionUrl ? { secondCtaUrl: data.conventionUrl, secondCtaLabel: "📄 Télécharger mon contrat (PDF)" } : {}),
    });
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.email,
      subject: `Bienvenue dans le réseau Sigma Factory — ${data.prenom} ${data.nom}`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur bienvenue ambassadeur avec mdp:", error); return false; }
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendBienvenueAmbassadeurAvecMdp:", err);
    return false;
  }
}



// ─── INVITATION POINT IMMOBILIER — Email lead avec lien RDV Elodie ───────────
export async function sendPointImmobilierInvitation(data: {
  nomLead: string;
  emailLead: string;
  rdvUrl: string;
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pole Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#fff">Felicitations, votre financement est valide !</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Prochaine etape - Recherche de bien</p><p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px">Bonjour ${data.nomLead},<br><br>Votre enveloppe de financement a ete validee. Vous passez maintenant a l etape <strong style="color:#fff">Recherche de Bien</strong> avec <strong style="color:#C9A84C">Elodie</strong>, votre conseillere immobiliere dediee chez Sigma Factory.<br><br>Elodie va vous accompagner dans la recherche du bien ideal correspondant a votre projet et a votre budget.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:20px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre prochaine etape</div><div style="color:#fff;font-size:15px;font-weight:bold">Point Immobilier avec Elodie</div><div style="color:#aaa;font-size:13px;margin-top:6px">Premier echange pour lancer votre recherche de bien - 45 min</div></div><div style="text-align:center;margin:28px 0"><a href="${data.rdvUrl}" style="background:#C9A84C;color:#000;text-decoration:none;padding:14px 32px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRENDRE MON RENDEZ-VOUS</a></div><p style="color:#555;font-size:12px;line-height:1.6">En cas de question : <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center">Sigma Factory - Pole Immobilier</div></div></body></html>`;
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.emailLead,
      subject: `Votre financement est valide - Prenez votre Point Immobilier avec Elodie`,
      html,
    });
    if (error) { console.error("[Mailer] Erreur sendPointImmobilierInvitation:", error); return false; }
    console.log(`[Mailer] Invitation Point Immobilier envoyee a ${data.emailLead}`);
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendPointImmobilierInvitation:", err);
    return false;
  }
}

// ─── Invitation pré-remplissage Mandat de Recherche ──────────────────────────
export async function sendMandatInvitationLead(data: {
  nomLead: string;       // ex: "CALIXTE" ou "MOHAMED & VERDON" pour les couples
  emailLead: string;
  mandatUrl: string;
  isCouple?: boolean;    // true si le nom contient deux personnes
}): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Civilité adaptée : couple → "Madame, Monsieur," / seul → "Madame, Monsieur," (neutre)
    const salutation = data.isCouple
      ? `Madame, Monsieur <strong style="color:#fff">${data.nomLead}</strong>,`
      : `Madame, Monsieur <strong style="color:#fff">${data.nomLead}</strong>,`;
    const subject = `Famille ${data.nomLead} — Pré-remplissez votre Mandat de Recherche — Sigma Factory`;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pôle Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#fff">Votre Mandat de Recherche est prêt à compléter</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Étape Recherche de Bien — Sigma Factory</p><p style="color:#aaa;font-size:14px;line-height:1.8;margin:0 0 20px">${salutation}<br><br>Votre dossier avance ! Dans le cadre de votre accompagnement Sigma Factory, nous vous invitons à <strong style="color:#fff">pré-remplir votre Mandat de Recherche et de Négociation</strong> afin qu'Élodie, votre conseillère immobilière dédiée, puisse démarrer officiellement la recherche de votre bien.<br><br>Une fois vos informations renseignées, vous recevrez le <strong style="color:#C9A84C">vrai mandat à signer électroniquement</strong> via notre plateforme officielle.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px 24px;margin:0 0 28px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Ce que vous allez renseigner</div><div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px">Mandat de Recherche et de Négociation</div><div style="color:#aaa;font-size:13px;line-height:1.8">• Vos coordonnées et celles de votre co-acquéreur (si applicable)<br>• La description de votre bien idéal<br>• Votre budget maximum<br>• Durée : <strong style="color:#ddd">12 mois</strong> — Honoraires : <strong style="color:#ddd">5% HT</strong></div></div><div style="background:#1a1a0a;border:1px solid rgba(201,168,76,0.2);padding:14px 20px;margin:0 0 28px;border-radius:2px"><div style="color:#C9A84C;font-size:11px;font-weight:bold;margin-bottom:4px">ℹ Étape suivante après validation</div><div style="color:#aaa;font-size:12px">Vous recevrez le mandat officiel à signer électroniquement via notre plateforme partenaire.</div></div><div style="text-align:center;margin:28px 0"><a href="${data.mandatUrl}" style="background:#C9A84C;color:#000;text-decoration:none;padding:16px 36px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRÉ-REMPLIR MON MANDAT</a></div><p style="color:#666;font-size:12px;line-height:1.6;text-align:center;margin:0 0 24px">Le formulaire est pré-rempli avec vos informations.<br>Il vous suffit de vérifier et compléter la description de votre bien.</p><div style="border-top:1px solid #222;margin:24px 0"></div><div style="background:#0a0a0a;border:1px solid #222;padding:16px 20px;margin-bottom:20px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Après signature du mandat</div><div style="color:#fff;font-size:14px;font-weight:bold;margin-bottom:4px">Point Immobilier avec Élodie — 45 min</div><div style="color:#aaa;font-size:13px">Élodie vous contactera pour fixer votre premier rendez-vous de recherche.</div></div><p style="color:#555;font-size:12px;line-height:1.6;margin:0">Une question ? <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center;line-height:1.6">Sigma Factory — Pôle Immobilier<br><a href="https://www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/" style="color:#555;text-decoration:none">Politique de confidentialité</a> &nbsp;·&nbsp; <a href="mailto:contact@sigmafactory.fr" style="color:#555;text-decoration:none">contact@sigmafactory.fr</a></div></div></body></html>`;
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: data.emailLead,
      subject,
      html,
    });
    if (error) { console.error("[Mailer] Erreur sendMandatInvitationLead:", error); return false; }
    console.log(`[Mailer] Invitation mandat envoyée à ${data.emailLead}`);
    return true;
  } catch (err) {
    console.error("[Mailer] Erreur sendMandatInvitationLead:", err);
    return false;
  }
}
