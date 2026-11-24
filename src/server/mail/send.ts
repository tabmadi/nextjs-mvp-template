import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

export type Mail = { to: string; subject: string; text: string };

const state = globalThis as typeof globalThis & { mailTransport?: Transporter | null };

// Without SMTP_HOST, as on a laptop, mail goes to the log instead.
function transport(): Transporter | null {
  if (state.mailTransport !== undefined) return state.mailTransport;
  const host = process.env.SMTP_HOST;
  state.mailTransport = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
          : undefined,
      })
    : null;
  return state.mailTransport;
}

export async function sendMail(mail: Mail): Promise<void> {
  const smtp = transport();
  if (!smtp) {
    console.warn(`mail to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return;
  }
  await smtp.sendMail({ from: process.env.SMTP_FROM, ...mail });
}

/** The public origin for links in mail. */
export function appUrl(path: string): string {
  return new URL(path, process.env.AUTH_URL ?? "http://localhost:3000").toString();
}
