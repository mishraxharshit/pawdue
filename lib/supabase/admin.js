import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client that bypasses Row Level Security.
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser or a client component -
 * this file must only ever be imported from server-side code (API routes).
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
