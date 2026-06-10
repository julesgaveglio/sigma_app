import { google } from "googleapis";

const CLIENT_ID = "353643313619-j0eaon2t35smaiu03rb76ai90a2jqn6q.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://mail.google.com/"],
  prompt: "consent",
});

console.log("\n=== URL D'AUTORISATION GOOGLE ===");
console.log(authUrl);
console.log("\nOuvrez cette URL dans votre navigateur, connectez-vous avec sigmaipf@gmail.com");
console.log("et copiez le CODE d'autorisation affiché.\n");
