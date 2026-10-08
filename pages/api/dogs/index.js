import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { defaultIntervalFor } from "../../../lib/breedIntervals";
import { planLimit } from "../../../lib/plans";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    // ?archived=1 shows only archived dogs (for the "Archived" tab); default
    // view hides them so a groomer's active list doesn't get cluttered.
    const showArchived = req.query.archived === "1";
    let query = supabase.from("dogs").select("*").order("last_groom_date", { ascending: true });
    query = showArchived ? query.eq("is_archived", true) : query.eq("is_archived", false);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    // This list changes the moment a dog is added/edited - never cache it.
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { dogName, ownerName, phone, breed, lastGroomDate, customWeeks, notes, ownerEmail } = req.body || {};
    if (!dogName || !ownerName || !phone || !breed || !lastGroomDate || !ownerEmail) {
      return res.status(400).json({ error: "dogName, ownerName, phone, breed, lastGroomDate, and ownerEmail are required" });
    }

    // Look up the user's plan (admin client because RLS only lets users read
    // their own row, but we still want this check to be reliable even if
    // that row doesn't exist yet - a missing row means "free").
    const admin = createSupabaseAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const limit = planLimit(sub?.plan || "free");

    const { count } = await supabase
      .from("dogs")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false);
    if (typeof count === "number" && count >= limit) {
      return res.status(403).json({
        error: `You've reached your plan's limit of ${limit} dogs. Upgrade to add more.`,
        limitReached: true,
      });
    }

    const interval_weeks = customWeeks ? Number(customWeeks) : defaultIntervalFor(breed);

    const { data, error } = await supabase
      .from("dogs")
      .insert({
        user_id: user.id,
        dog_name: dogName,
        owner_name: ownerName,
        phone,
        breed,
        interval_weeks,
        last_groom_date: lastGroomDate,
        notes: notes || null,
        owner_email: ownerEmail || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
