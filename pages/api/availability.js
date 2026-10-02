import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { getAvailabilitySettings } from "../../lib/booking";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validate(body) {
  const workingDays = Array.isArray(body.workingDays)
    ? body.workingDays.filter((d) => DAYS.includes(d))
    : null;
  if (!workingDays || workingDays.length === 0) return "Pick at least one working day.";
  if (!TIME_RE.test(body.startTime || "")) return "Start time is invalid.";
  if (!TIME_RE.test(body.endTime || "")) return "End time is invalid.";
  if (body.startTime >= body.endTime) return "Start time must be before end time.";
  const slotMinutes = Number(body.slotMinutes);
  if (![15, 30, 45, 60, 90, 120].includes(slotMinutes)) return "Slot length is invalid.";
  if (body.breakStart || body.breakEnd) {
    if (!TIME_RE.test(body.breakStart || "") || !TIME_RE.test(body.breakEnd || "")) {
      return "Break start/end time is invalid.";
    }
    if (body.breakStart >= body.breakEnd) return "Break start must be before break end.";
    if (body.breakStart < body.startTime || body.breakEnd > body.endTime) {
      return "Break window must fall within working hours.";
    }
  }
  const daysAhead = Number(body.daysAhead);
  if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 60) {
    return "Days ahead must be a whole number between 1 and 60.";
  }
  return null;
}

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const admin = createSupabaseAdminClient();

  if (req.method === "GET") {
    const settings = await getAvailabilitySettings(admin, user.id);
    return res.status(200).json(settings);
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { error } = await admin.from("availability_settings").upsert({
      user_id: user.id,
      working_days: body.workingDays,
      start_time: body.startTime,
      end_time: body.endTime,
      slot_minutes: Number(body.slotMinutes),
      break_start: body.breakStart || null,
      break_end: body.breakEnd || null,
      days_ahead: Number(body.daysAhead),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("availability upsert failed:", error.message);
      return res.status(500).json({ error: "Could not save availability settings." });
    }

    const settings = await getAvailabilitySettings(admin, user.id);
    return res.status(200).json(settings);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
