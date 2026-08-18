import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

const FROM_NAME = "RYMX";

// No-op (console-log only) when Gmail creds aren't configured — true in local
// dev/emulator use before GMAIL_USER/GMAIL_APP_PASSWORD are set. Never
// throws: an email failure should never fail the action that triggered it
// (checkout, promo issuance, etc).
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  // Gmail SMTP via an App Password (not the account password — see
  // .env.example for the setup steps). Requires 2-Step Verification enabled
  // on the sending account.
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const user = process.env.GMAIL_USER;
  const client = getTransporter();
  if (!client || !user) {
    console.log(
      `[email:skipped, no GMAIL_USER/GMAIL_APP_PASSWORD] to=${params.to} subject="${params.subject}"`,
    );
    return;
  }

  try {
    await client.sendMail({
      from: `${FROM_NAME} <${user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error("Failed to send email", { to: params.to, subject: params.subject, err });
  }
}
