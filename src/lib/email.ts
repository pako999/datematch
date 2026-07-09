import "server-only";
import { Resend } from "resend";

/**
 * All outbound email. No-ops (with a console note) when Resend isn't
 * configured so local dev never blocks on email.
 */

function getResend(): { client: Resend; from: string } | null {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return null;
  return { client: new Resend(key), from };
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.info(`[email skipped — Resend not configured] ${subject} → ${to}`);
    return;
  }
  try {
    await resend.client.emails.send({ from: resend.from, to, subject, html });
  } catch (err) {
    console.warn(`resend send failed (${subject}):`, err);
  }
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function staffTemplate(title: string, body: string, ctaPath: string, cta: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    <p style="font-size:14px;line-height:1.6;color:#333">${body}</p>
    <p style="margin-top:20px">
      <a href="${APP_URL()}${ctaPath}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">${cta}</a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#888">DateMatch staff console</p>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Staff notifications                                                 */
/* ------------------------------------------------------------------ */

export async function notifyStaffIntroUpdate(opts: {
  staffEmail: string;
  introId: string;
  headline: string;
  detail: string;
}): Promise<void> {
  await send(
    opts.staffEmail,
    `[DateMatch] ${opts.headline}`,
    staffTemplate(opts.headline, opts.detail, `/introductions/${opts.introId}`, "Open introduction"),
  );
}

export async function nudgeStaff(opts: {
  staffEmail: string;
  subject: string;
  body: string;
  path: string;
}): Promise<void> {
  await send(
    opts.staffEmail,
    `[DateMatch] ${opts.subject}`,
    staffTemplate(opts.subject, opts.body, opts.path, "Open in console"),
  );
}

/* ------------------------------------------------------------------ */
/* Client-facing intro email (optional, on mutual acceptance)          */
/* ------------------------------------------------------------------ */

export async function sendIntroEmail(opts: {
  toEmail: string;
  toFirstName: string;
  otherFirstName: string;
  matchmakerName: string;
}): Promise<void> {
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="font-size:18px;margin:0 0 12px">A lovely introduction awaits</h2>
    <p style="font-size:14px;line-height:1.6;color:#333">
      Dear ${opts.toFirstName},<br/><br/>
      Wonderful news — you and ${opts.otherFirstName} have both said yes to an
      introduction. Your matchmaker ${opts.matchmakerName} will be in touch
      shortly to arrange a time and place that suits you both.
    </p>
    <p style="margin-top:24px;font-size:12px;color:#888">
      Sent with care by your matchmaking team. Reply to this email to reach us.
    </p>
  </div>`;
  await send(opts.toEmail, "You have an introduction!", html);
}
