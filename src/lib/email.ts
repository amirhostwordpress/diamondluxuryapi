// ─────────────────────────────────────────────────────────────────────────────
// Email utility (Nodemailer + Gmail SMTP)
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer, { Transporter } from "nodemailer";
import { emailConfig, appConfig } from "../config";

// ── Transporter singleton ─────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _mailer: Transporter | undefined;
}

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host:   emailConfig.host,
    port:   emailConfig.port,
    secure: emailConfig.secure, // true for port 465, false for 587
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,   // Gmail App Password (not your account password)
    },
  });
}

const mailer: Transporter =
  globalThis._mailer ?? (globalThis._mailer = createTransporter());

// ── Generic send ──────────────────────────────────────────────────────────────
interface SendOptions {
  to:      string | string[];
  subject: string;
  html:    string;
  text?:   string;
  replyTo?: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  await mailer.sendMail({
    from:    emailConfig.from,
    to:      Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
    replyTo: opts.replyTo,
  });
}

// ── Shared layout ─────────────────────────────────────────────────────────────
function layout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appConfig.siteName}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#111;padding:28px 40px;border-bottom:1px solid #222;text-align:center;">
              <p style="margin:0;font-size:10px;letter-spacing:4px;color:#c9a85c;text-transform:uppercase;">Diamond Luxury Real Estate</p>
              <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">Dubai's Premier Property Brokerage</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;color:#ccc;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;">
                © ${new Date().getFullYear()} ${appConfig.siteName} · Dubai, UAE<br/>
                <a href="${appConfig.siteUrl}" style="color:#c9a85c;text-decoration:none;">${appConfig.siteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Contact-form notification (to admin) ──────────────────────────────────────
export interface ContactFormData {
  firstName: string;
  lastName:  string;
  email:     string;
  phone?:    string;
  interest:  string;
  budget?:   string;
  message?:  string;
}

export async function sendContactNotification(data: ContactFormData): Promise<void> {
  const interestMap: Record<string, string> = {
    buy: "Buying a Villa", rent: "Renting a Villa",
    sell: "Selling a Property", offplan: "Off-Plan Investment", other: "General Enquiry",
  };
  const interestLabel = interestMap[data.interest] ?? data.interest;

  const body = `
    <h2 style="color:#c9a85c;margin-top:0;">New Enquiry Received</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;color:#888;width:140px;">Name</td><td style="padding:8px 0;color:#fff;">${data.firstName} ${data.lastName}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${data.email}" style="color:#c9a85c;">${data.email}</a></td></tr>
      ${data.phone ? `<tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;color:#fff;">${data.phone}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#888;">Interest</td><td style="padding:8px 0;color:#fff;">${interestLabel}</td></tr>
      ${data.budget ? `<tr><td style="padding:8px 0;color:#888;">Budget</td><td style="padding:8px 0;color:#fff;">${data.budget}</td></tr>` : ""}
    </table>
    ${data.message ? `
    <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:6px;border-left:3px solid #c9a85c;">
      <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="margin:0;color:#ccc;">${data.message.replace(/\n/g, "<br/>")}</p>
    </div>` : ""}
    <p style="margin-top:28px;"><a href="${appConfig.siteUrl}/admin/enquiries" style="display:inline-block;padding:12px 24px;background:#c9a85c;color:#000;text-decoration:none;border-radius:4px;font-weight:600;">View in Admin</a></p>`;

  await sendEmail({
    to:      emailConfig.adminEmail,
    subject: `New Enquiry from ${data.firstName} ${data.lastName} — ${interestLabel}`,
    html:    layout(body),
    replyTo: data.email,
  });
}

// ── Contact-form confirmation (to client) ─────────────────────────────────────
export async function sendContactConfirmation(data: ContactFormData): Promise<void> {
  const body = `
    <h2 style="color:#c9a85c;margin-top:0;">Thank You, ${data.firstName}!</h2>
    <p style="color:#ccc;">We've received your enquiry and one of our specialists will be in touch within <strong style="color:#fff;">24 hours</strong>.</p>
    <p style="color:#ccc;">In the meantime, feel free to browse our latest properties:</p>
    <p style="margin-top:24px;">
      <a href="${appConfig.siteUrl}/buy" style="display:inline-block;padding:12px 24px;background:#c9a85c;color:#000;text-decoration:none;border-radius:4px;font-weight:600;margin-right:12px;">View Villas for Sale</a>
      <a href="${appConfig.siteUrl}/rent" style="display:inline-block;padding:12px 24px;background:transparent;border:1px solid #c9a85c;color:#c9a85c;text-decoration:none;border-radius:4px;font-weight:600;">View Rental Villas</a>
    </p>
    <p style="margin-top:28px;color:#555;font-size:13px;">This is an automated confirmation. Please do not reply to this email — our team will contact you directly from a personal email address.</p>`;

  await sendEmail({
    to:      data.email,
    subject: `We've received your enquiry — ${appConfig.siteName}`,
    html:    layout(body),
  });
}

// ── Newsletter welcome email ───────────────────────────────────────────────────
export async function sendNewsletterWelcome(email: string): Promise<void> {
  const body = `
    <h2 style="color:#c9a85c;margin-top:0;">Welcome to Diamond Insights!</h2>
    <p style="color:#ccc;">You're now subscribed to our weekly Dubai real estate newsletter. Expect:</p>
    <ul style="color:#ccc;padding-left:20px;line-height:2;">
      <li>Exclusive market reports & price trends</li>
      <li>New luxury listings before they go public</li>
      <li>Off-plan launch invitations</li>
      <li>Expert investment guides</li>
    </ul>
    <p style="margin-top:24px;">
      <a href="${appConfig.siteUrl}/news" style="display:inline-block;padding:12px 24px;background:#c9a85c;color:#000;text-decoration:none;border-radius:4px;font-weight:600;">Read Latest Articles</a>
    </p>`;

  await sendEmail({
    to:      email,
    subject: `Welcome to Diamond Luxury Real Estate Insights`,
    html:    layout(body),
  });
}

// ── Property enquiry notification (property-specific) ─────────────────────────
export async function sendPropertyEnquiryNotification(
  data: ContactFormData & { propertyTitle: string; propertyUrl: string }
): Promise<void> {
  const body = `
    <h2 style="color:#c9a85c;margin-top:0;">Property Enquiry Received</h2>
    <div style="padding:16px;background:#1a1a1a;border-radius:6px;margin-bottom:20px;border-left:3px solid #c9a85c;">
      <p style="margin:0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Property</p>
      <p style="margin:4px 0 0;"><a href="${data.propertyUrl}" style="color:#c9a85c;font-size:16px;font-weight:600;">${data.propertyTitle}</a></p>
    </div>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;color:#888;width:140px;">Client</td><td style="padding:8px 0;color:#fff;">${data.firstName} ${data.lastName}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${data.email}" style="color:#c9a85c;">${data.email}</a></td></tr>
      ${data.phone ? `<tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;color:#fff;">${data.phone}</td></tr>` : ""}
      ${data.budget ? `<tr><td style="padding:8px 0;color:#888;">Budget</td><td style="padding:8px 0;color:#fff;">${data.budget}</td></tr>` : ""}
    </table>
    ${data.message ? `<div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:6px;"><p style="margin:0;color:#ccc;">${data.message}</p></div>` : ""}`;

  await sendEmail({
    to:      emailConfig.adminEmail,
    subject: `Property Enquiry: ${data.propertyTitle}`,
    html:    layout(body),
    replyTo: data.email,
  });
}
