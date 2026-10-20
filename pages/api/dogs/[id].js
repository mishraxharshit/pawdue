import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getBusinessTimezone, localDateString } from "../../../lib/booking";
import { validateDogInput } from "../../../lib/validate";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;

  if (req.method === "PATCH") {
    const body = req.body || {};
    const checked = validateDogInput(body, { partial: true });
    if (checked.error) return res.status(400).json({ error: checked.error });
    const v = checked.values;

    const update = {};
    if (body.markGroomedToday) {
      // "Today" is the groomer's local date, not the server's (UTC) date.
      const tz = await getBusinessTimezone(createSupabaseAdminClient(), user.id);
      update.last_groom_date = localDateString(tz);
    }
    if (v.dogName) update.dog_name = v.dogName;
    if (v.ownerName) update.owner_name = v.ownerName;
    if (v.phone) update.phone = v.phone;
    if (v.breed) update.breed = v.breed;
    if (v.intervalWeeks) update.interval_weeks = v.intervalWeeks;
    if (v.lastGroomDate) update.last_groom_date = v.lastGroomDate;
    // These can legitimately be set to a falsy value (empty notes, un-archiving,
    // opting back in), so they need an explicit "was this key sent at all" check.
    if (v.notes !== undefined) update.notes = v.notes;
    if (v.ownerEmail !== undefined) update.owner_email = v.ownerEmail;
    if (body.isArchived !== undefined) update.is_archived = !!body.isArchived;
    if (body.optedOut !== undefined) update.opted_out = !!body.optedOut;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    // RLS ensures this only succeeds if the dog belongs to `user`
    const { data, error } = await supabase
      .from("dogs")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("dog update failed:", error.message);
      return res.status(500).json({ error: "Could not update this dog. Please try again." });
    }
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
