import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "Sigma Factory <onboarding@resend.dev>",
  to: ["othmanehiyadi@sigmaipf.fr"],
  subject: "Test notification Sigma Factory",
  html: "<h1 style='color:#D4AF37'>SIGMA FACTORY</h1><p>Test de notification email — système opérationnel ✅</p>",
});

if (error) {
  console.error("FAIL:", JSON.stringify(error));
  process.exit(1);
} else {
  console.log("OK: email envoyé avec succès, ID:", data?.id);
}
