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
    <p style="margin-top:24px;font-size:12px;color:#888">DateMatch — konzola za zaposlene</p>
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
    staffTemplate(opts.headline, opts.detail, `/introductions/${opts.introId}`, "Odpri predstavitev"),
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
    staffTemplate(opts.subject, opts.body, opts.path, "Odpri v konzoli"),
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
    <h2 style="font-size:18px;margin:0 0 12px">Čaka vas prijetna predstavitev</h2>
    <p style="font-size:14px;line-height:1.6;color:#333">
      Pozdravljeni, ${opts.toFirstName}!<br/><br/>
      Čudovita novica — vi in ${opts.otherFirstName} sta oba privolila v
      predstavitev. Vaš svetovalec ${opts.matchmakerName} vas bo kmalu
      kontaktiral in uskladil termin ter kraj, ki ustrezata obema.
    </p>
    <p style="margin-top:24px;font-size:12px;color:#888">
      S skrbnostjo poslala vaša ekipa DateMatch. Za vprašanja odgovorite na to sporočilo.
    </p>
  </div>`;
  await send(opts.toEmail, "Čaka vas predstavitev!", html);
}
