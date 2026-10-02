import { Resend } from "resend";

// Feedback has no database table of its own - it's low-volume enough that
// emailing the team directly (reusing the same Resend key already used for
// reminder emails) is simpler than adding a table + admin view for it.
// Falls back to a server log if RESEND_API_KEY isn't set yet, so the form
// still "works" (and can be checked in Vercel logs) during local setup.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, category, message } = req.body || {};

  if (!message || !message.trim()) {
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
      reply_to: email || undefined,
      subject: `PawDue feedback${category ? ` — ${category}` : ""}`,
      text: `From: ${name || "Anonymous"} <${email || "no email given"}>\nCategory: ${category || "General"}\n\n${message}`,
    });
    return res.status(200).json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[feedback] failed to send", err);
    return res.status(500).json({ error: "Couldn't send that just now — please try again shortly." });
  }
}
