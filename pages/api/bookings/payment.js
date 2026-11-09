import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { validatePaid } from "../../../lib/payments";
import { notifyPaymentReceived } from "../../../lib/bookingNotify";

// The groomer records that a client paid them (or undoes it). PawDue does not
// move any money: this only keeps the record and can email the client a receipt.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id, paid, sendReceipt } = req.body || {};
  if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

  const admin = createSupabaseAdminClient();
  const { data: booking } = await admin.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking || booking.user_id !== user.id) return res.status(404).json({ error: "Booking not found" });

  const setupMsg = "Run supabase/add-payments.sql in the Supabase SQL Editor first.";

  if (paid === false) {
    const { data, error } = await admin
      .from("bookings")
      .update({ paid_at: null, paid_amount: null, paid_method: null, receipt_sent_at: null })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) return res.status(500).json({ error: `Could not update. ${setupMsg}` });
    return res.status(200).json({ ok: true, booking: data });
  }

  const checked = validatePaid(req.body, booking);
  if (checked.error) return res.status(400).json({ error: checked.error });

  const { data: updated, error } = await admin
    .from("bookings")
    .update({ paid_at: new Date().toISOString(), paid_amount: checked.values.amount, paid_method: checked.values.method })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error || !updated) return res.status(500).json({ error: `Could not save the payment. ${setupMsg}` });

  // One receipt per payment: marking it paid again does not email twice.
  let receipt = "skipped";
  if (sendReceipt && !booking.receipt_sent_at) {
    const { data: dog } = await admin
      .from("dogs")
      .select("dog_name, owner_name, owner_email")
      .eq("id", booking.dog_id)
      .maybeSingle();
    receipt = dog ? await notifyPaymentReceived(admin, { userId: user.id, dog, booking: updated }) : "no-dog";
    if (receipt === "sent") {
      const now = new Date().toISOString();
      await admin.from("bookings").update({ receipt_sent_at: now }).eq("id", id).eq("user_id", user.id);
      updated.receipt_sent_at = now;
    }
  }
  return res.status(200).json({ ok: true, receipt, booking: updated });
}
