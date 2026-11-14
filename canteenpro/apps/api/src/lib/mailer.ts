import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getSettings } from "./settings";
import { DEFAULT_TEMPLATES } from "./email-templates";

export const render = (tpl: string, vars: Record<string, unknown>) =>
  tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k
      .split(".")
      .reduce((o: any, p: string) => (o == null ? o : o[p]), vars);
    return v == null ? "" : String(v);
  });

async function transport() {
  const s = await getSettings([
    "smtp.host", // e.g. smtp.gmail.com
    "smtp.port",
    "smtp.secure",
    "smtp.user",
    "smtp.pass",
    "smtp.from",
  ]);
  if (!s["smtp.host"]) return null;
  return {
    from: s["smtp.from"] || s["smtp.user"],
    t: nodemailer.createTransport({
      host: s["smtp.host"],
      port: Number(s["smtp.port"] || 587),
      secure: s["smtp.secure"] === "true",
      auth: s["smtp.user"]
        ? { user: s["smtp.user"], pass: s["smtp.pass"] }
        : undefined,
    }),
  };
}

function layout(body: string, brand: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#1e293b">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="background:#1e3a8a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">${brand}</td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6">${body}</td></tr>
  <tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px">You are receiving this because you have an account with ${brand}.</td></tr>
  </table></td></tr></table></body></html>`;
}

/**
 * Send an email using a template key (DB template, falling back to defaults).
 * Never throws — failures are logged to email_logs.
 */
export async function sendTemplateMail(
  to: string,
  templateKey: string,
  vars: Record<string, unknown>,
  opts: { tenantId?: string } = {},
) {
  const [row] = await db
    .select()
    .from(schema.emailTemplates)
    .where(eq(schema.emailTemplates.key, templateKey));
  const def = DEFAULT_TEMPLATES.find((t) => t.key === templateKey);
  if (row && !row.isActive) return { status: "SKIPPED" as const };
  const subjectTpl = row?.subject ?? def?.subject ?? templateKey;
  const htmlTpl = row?.html ?? def?.html ?? "";
  return sendMail(to, render(subjectTpl, vars), render(htmlTpl, vars), {
    ...opts,
    template: templateKey,
  });
}

export async function sendMail(
  to: string,
  subject: string,
  htmlBody: string,
  opts: {
    tenantId?: string;
    template?: string;
    attachments?: { filename: string; content: string }[];
  } = {},
) {
  const brand =
    (await getSettings(["brand.name"]))["brand.name"] || "CanteenPro";
  const tr = await transport();
  const log = (status: string, error?: string) =>
    db
      .insert(schema.emailLogs)
      .values({
        to,
        subject,
        template: opts.template,
        status,
        error,
        tenantId: opts.tenantId,
      })
      .catch(() => {});
  if (!tr) {
    console.info(`[mail] SMTP not configured — skipped "${subject}" to ${to}`);
    await log("SKIPPED", "SMTP not configured");
    return { status: "SKIPPED" as const };
  }
  try {
    await tr.t.sendMail({
      from: tr.from,
      to,
      subject,
      html: layout(htmlBody, brand),
      attachments: opts.attachments,
    });
    await log("SENT");
    return { status: "SENT" as const };
  } catch (e: any) {
    console.error("[mail] failed", e?.message);
    await log("FAILED", String(e?.message ?? e).slice(0, 500));
    return { status: "FAILED" as const, error: e?.message };
  }
}
