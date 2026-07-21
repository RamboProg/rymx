import "server-only";

import { Resend } from "resend";

const FROM_ADDRESS = "RYMX <orders@rymx.test>";

// No-op (console-log only) when there's no real API key configured — true in
// local dev/emulator use and in this project before a Resend account is
// wired up. Never throws: an email failure should never fail the action that
// triggered it (checkout, promo issuance, etc).
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:skipped, no RESEND_API_KEY] to=${params.to} subject="${params.subject}"`);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error("Failed to send email", { to: params.to, subject: params.subject, err });
  }
}
