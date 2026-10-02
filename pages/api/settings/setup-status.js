import { createSupabaseServerClient } from "../../../lib/supabase/server";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const issues = [];

  // Email is the only channel guaranteed to be configured right now
  // (WhatsApp/SMS are optional add-ons - see lib/messaging.js). A dog with
  // no email and no working WhatsApp/SMS gets zero reminders, silently.
  const whatsappConfigured = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  if (!whatsappConfigured && !smsConfigured) {
    const { data: activeDogs } = await supabase
      .from("dogs")
      .select("owner_email")
      .eq("is_archived", false);

    const count = (activeDogs || []).filter((d) => !d.owner_email || !d.owner_email.trim()).length;

    if (count > 0) {
      issues.push({
        key: "dogs_without_channel",
        severity: "high",
        message: `${count} dog${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} no owner email on file, and WhatsApp/SMS aren't connected yet — they won't receive reminders.`,
      });
    }
  }

  // Resend's shared sandbox sender has poor deliverability and is meant for
  // testing only - if it's still in use, reminder emails are more likely to
  // land in spam, which matters a lot now that email is the primary channel.
  const fromEmail = process.env.REMINDER_FROM_EMAIL || "";
  if (!fromEmail || fromEmail.includes("resend.dev")) {
    issues.push({
      key: "sandbox_email_sender",
      severity: "medium",
      message: "Reminders are sending from Resend's shared test address, which often lands in spam. Verify your own domain in Resend and set REMINDER_FROM_EMAIL to an address on it.",
    });
  }

  return res.status(200).json({ issues });
}
