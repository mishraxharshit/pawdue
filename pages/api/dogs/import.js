import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { defaultIntervalFor } from "../../../lib/breedIntervals";
import { planLimit } from "../../../lib/plans";
import { normalizeRecords, MAX_IMPORT_ROWS } from "../../../lib/importDogs";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

const IDENTITY = {
  dogName: "dogName",
  ownerName: "ownerName",
  ownerEmail: "ownerEmail",
  phone: "phone",
  breed: "breed",
  lastGroomDate: "lastGroomDate",
  customWeeks: "customWeeks",
  notes: "notes",
};

// Imports many dogs at once from rows the browser already cleaned up. The
// server re-validates every row (never trust the client), skips dogs that
// already exist, and stops at the plan's dog limit instead of failing the
// whole file.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows to import." });
  if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ error: `Import at most ${MAX_IMPORT_ROWS} dogs at a time.` });

  const { ok, problems } = normalizeRecords(rows.map((r) => ({ ...r, customWeeks: r?.customWeeks ?? "" })), IDENTITY);

  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("plan").eq("user_id", user.id).maybeSingle();
  const limit = planLimit(sub?.plan || "free");

  const { data: existing, error: existingErr } = await supabase
    .from("dogs")
    .select("dog_name, owner_name, is_archived");
  if (existingErr) return res.status(500).json({ error: existingErr.message });

  const existingKeys = new Set((existing || []).map((d) => `${d.dog_name}|${d.owner_name}`.toLowerCase()));
  const activeCount = (existing || []).filter((d) => !d.is_archived).length;

  const fresh = ok.filter((r) => !existingKeys.has(`${r.dog.dogName}|${r.dog.ownerName}`.toLowerCase()));
  const skippedDuplicates = ok.length - fresh.length;

  const room = Number.isFinite(limit) ? Math.max(0, limit - activeCount) : fresh.length;
  const toInsert = fresh.slice(0, room);
  const skippedOverLimit = fresh.length - toInsert.length;

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100).map(({ dog }) => ({
      user_id: user.id,
      dog_name: dog.dogName,
      owner_name: dog.ownerName,
      owner_email: dog.ownerEmail || null,
      phone: dog.phone || "",
      breed: dog.breed,
      interval_weeks: dog.customWeeks || defaultIntervalFor(dog.breed),
      last_groom_date: dog.lastGroomDate,
      notes: dog.notes || null,
    }));
    const { error } = await supabase.from("dogs").insert(chunk);
    if (error) {
      return res.status(500).json({ error: `Import stopped after ${imported} dogs: ${error.message}`, imported });
    }
    imported += chunk.length;
  }

  return res.status(200).json({
    imported,
    skippedDuplicates,
    skippedOverLimit,
    limitReached: skippedOverLimit > 0,
    limit: Number.isFinite(limit) ? limit : null,
    problems,
  });
}
