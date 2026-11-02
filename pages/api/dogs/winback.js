import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { sendEmail } from "../../../lib/messaging";
import { buildWinbackEmail, cleanMessage, winbackTooSoon } from "../../../lib/winback";

// Sends one personal win-back email for one dog, only when the groomer asks.
// Guards: the dog must belong to the caller, must not be archived or opted
// out, needs an owner email, and the same dog is not emailed twice in 7 days.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { dogId, message } = req.body || {};
  const text = cleanMessage(message);
  if (!dogId || typeof dogId !== "string") return res.status(400).json({ error: "dogId is required" });
  if (!text) return res.status(400).json({ error: "Write a message first" });

  const { data: dog } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", dogId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dog || dog.is_archived) return res.status(404).json({ error: "Dog not found" });
  if (dog.opted_out) return res.status(400).json({ error: "This owner asked to stop reminders" });
  if (!dog.owner_email) return res.status(400).json({ error: "No owner email on file" });
  if (winbackTooSoon(dog.last_winback_at)) {
    return res.status(409).json({ error: "You already sent this owner a message in the last 7 days" });
  }

  const { data: profile } = await supabase
    .from("business_settings")
    .select("business_name, business_phone, reply_to_email")
    .eq("user_id", user.id)
    .maybeSingle();

  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://pawdue.pet").replace(/\/$/, "");
  const email = buildWinbackEmail({
    dog,
    message: text,
    salon: profile?.business_name || "",
    phone: profile?.business_phone || "",
    bookUrl: dog.booking_token ? `${base}/book/${dog.booking_token}` : "",
  });

  try {
    await sendEmail(dog.owner_email, email.subject, email.text, {
      html: email.html,
      replyTo: profile?.reply_to_email || user.email || undefined,
      fromName: profile?.business_name || undefined,
    });
  } catch (err) {
    console.error("[winback] send failed:", err.message);
    return res.status(502).json({ error: "The email could not be sent. Try again in a minute." });
  }

  // Remember it so the same owner is not messaged twice by accident. If the
  // column is missing the email still went out, so ignore that error.
  await supabase.from("dogs").update({ last_winback_at: new Date().toISOString() }).eq("id", dog.id).eq("user_id", user.id);

  return res.status(200).json({ ok: true, sentTo: dog.owner_email });
}
