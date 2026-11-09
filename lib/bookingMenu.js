// Server-side: loads the groomer's active menu for the booking page and for the
// booking itself. Every lookup is allowed to fail quietly - a database that has
// not run supabase/add-services.sql yet just has no menu, and booking works as
// it always did.
import { DEFAULT_SIZE_GUIDE } from "./services";
import { readMethods } from "./payments";

/** Active services of one groomer, or [] when there are none / no table yet. */
export async function loadActiveServices(admin, userId) {
  const { data, error } = await admin
    .from("services")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data;
}

/** Currency, size guide and booking message; safe defaults on any failure. */
export async function loadShopSettings(admin, userId) {
  const { data, error } = await admin
    .from("business_settings")
    .select("currency, size_guide, booking_note")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { currency: "USD", sizeGuide: { ...DEFAULT_SIZE_GUIDE }, bookingNote: "" };
  return {
    currency: data.currency || "USD",
    sizeGuide: { ...DEFAULT_SIZE_GUIDE, ...(data.size_guide || {}) },
    bookingNote: data.booking_note || "",
  };
}

/**
 * What this dog booked last time, as ids that still exist on today's menu, so
 * the booking page can pre-select it. { serviceId, addonIds } or null.
 */
export async function loadLastPick(admin, dogId, services) {
  const { data, error } = await admin
    .from("bookings")
    .select("service_id, addons")
    .eq("dog_id", dogId)
    .not("service_id", "is", null)
    .order("slot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const mains = new Set(services.filter((s) => (s.kind || "main") === "main").map((s) => s.id));
  const addons = new Set(services.filter((s) => s.kind === "addon").map((s) => s.id));
  if (!mains.has(data.service_id)) return null;
  const addonIds = (Array.isArray(data.addons) ? data.addons : []).map((a) => a && a.id).filter((id) => addons.has(id));
  return { serviceId: data.service_id, addonIds };
}

/** The dog's saved size ("small" | "medium" | "large") or null. */
export async function loadDogSize(admin, dogId) {
  const { data, error } = await admin.from("dogs").select("size").eq("id", dogId).maybeSingle();
  if (error || !data) return null;
  return data.size || null;
}

/**
 * How this groomer accepts payment ({ methods: [{type,label,detail}], note }).
 * Empty on any failure, e.g. before supabase/add-payments.sql has been run.
 */
export async function loadPaymentInfo(admin, userId) {
  const { data, error } = await admin.from("business_settings").select("payment_methods, payment_note").eq("user_id", userId).maybeSingle();
  if (error || !data) return { methods: [], note: "" };
  return { methods: readMethods(data.payment_methods), note: data.payment_note || "" };
}
