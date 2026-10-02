import { createSupabaseServerClient } from "../../../lib/supabase/server";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;

  if (req.method === "PATCH") {
    const {
      markGroomedToday,
      dogName,
      ownerName,
      phone,
      breed,
      intervalWeeks,
      lastGroomDate,
      notes,
      isArchived,
      optedOut,
      ownerEmail,
    } = req.body || {};

    const update = {};
    if (markGroomedToday) update.last_groom_date = new Date().toISOString().slice(0, 10);
    if (dogName) update.dog_name = dogName;
    if (ownerName) update.owner_name = ownerName;
    if (phone) update.phone = phone;
    if (breed) update.breed = breed;
    if (intervalWeeks) update.interval_weeks = Number(intervalWeeks);
    if (lastGroomDate) update.last_groom_date = lastGroomDate;
    // These can legitimately be set to a falsy value (empty notes, un-archiving,
    // opting back in), so they need an explicit "was this key sent at all" check
    // rather than a truthiness check.
    if (notes !== undefined) update.notes = notes || null;
    if (ownerEmail !== undefined) update.owner_email = ownerEmail || null;
    if (isArchived !== undefined) update.is_archived = !!isArchived;
    if (optedOut !== undefined) update.opted_out = !!optedOut;

    // RLS ensures this only succeeds if the dog belongs to `user`
    const { data, error } = await supabase
      .from("dogs")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Dog not found" });
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { error, count } = await supabase
      .from("dogs")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    if (!count) return res.status(404).json({ error: "Dog not found" });
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
