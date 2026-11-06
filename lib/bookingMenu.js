// Server-side: loads the groomer's active menu for the booking page and for the
// booking itself. Every lookup is allowed to fail quietly - a database that has
// not run supabase/add-services.sql yet just has no menu, and booking works as
// it always did.
import { DEFAULT_SIZE_GUIDE } from "./services";

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

/** The dog's saved size ("small" | "medium" | "large") or null. */
export async function loadDogSize(admin, dogId) {
  const { data, error } = await admin.from("dogs").select("size").eq("id", dogId).maybeSingle();
  if (error || !data) return null;
  return data.size || null;
}
