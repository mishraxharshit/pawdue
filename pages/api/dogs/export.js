import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { toCsv } from "../../../lib/csv";

// Download every dog (active and archived) as a CSV. The column names match
// the import screen, so an export can be edited and imported again.
const HEADERS = ["Dog Name", "Owner Name", "Owner Email", "Phone", "Breed", "Last Groom Date", "Weeks", "Notes", "Archived", "Reminders Stopped"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase.from("dogs").select("*").order("dog_name", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const rows = (data || []).map((d) => ({
    "Dog Name": d.dog_name,
    "Owner Name": d.owner_name,
    "Owner Email": d.owner_email || "",
    Phone: d.phone || "",
    Breed: d.breed,
    "Last Groom Date": String(d.last_groom_date || "").slice(0, 10),
    Weeks: d.interval_weeks,
    Notes: d.notes || "",
    Archived: d.is_archived ? "yes" : "",
    "Reminders Stopped": d.opted_out ? "yes" : "",
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="pawdue-dogs-${stamp}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send("﻿" + toCsv(HEADERS, rows));
}
