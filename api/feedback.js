import { Resend } from "resend";
import { rateLimit } from "../../lib/rateLimit";

// Feedback has no database table of its own - it's low-volume enough that
// emailing the team directly (reusing the same Resend key already used for
// reminder emails) is simpler than adding a table + admin view for it.
// Falls back to a server log if RESEND_API_KEY isn't set yet, so the form
// still "works" (and can be checked in Vercel logs) during local setup.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, res, { name: "feedback", limit: 5, windowMs: 10 * 60 * 1000 })) return;

  const body = req.body || {};
  // Hidden "website" field: real people never fill it, simple bots do.
  if (body.website) return res.status(200).json({ ok: true, delivered: true });

  const clean = (v, max) => (typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "");
  const name = clean(body.name, 100);
  const email = clean(body.email, 254);
  const category = clean(body.category, 40);
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (message.length > 5000) {
    return res.status(400).json({ error: "That message is too long. Please keep it under 5000 characters." });
  }
  if (!message) {
    return res.status(400).json({ error: "Please include a message." });
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "That email address doesn't look right." });
  }

  const feedbackTo = process.env.FEEDBACK_TO_EMAIL || process.env.REMINDER_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !feedbackTo) {
    console.log("[feedback] RESEND_API_KEY or FEEDBACK_TO_EMAIL not set - logging instead of emailing:", {
      name, email, category, message,
    });
    return res.status(200).json({ ok: true, delivered: false });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL || "onboarding@resend.dev",
      to: feedbackTo,
      replyTo: email || undefined,
      subject: `PawDue feedback${category ? `: ${category}` : ""}`,
      text: `From: ${name || "Anonymous"} <${email || "no email given"}>\nCategory: ${category || "General"}\n\n${message}`,
    });
    return res.status(200).json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[feedback] failed to send", err);
    return res.status(500).json({ error: "Couldn't send that just now. Please try again shortly." });
  }
}
