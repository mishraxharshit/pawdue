import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { validateServiceInput, MAX_SERVICES } from "../../../lib/services";

// The groomer's own list of services and prices. Row level security keeps each
// account to its own rows; the checks here keep the data tidy.
export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    const { data, error } = await supabase.from("services").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) {
      console.error("services list failed:", error.message);
      return res.status(500).json({ error: "Could not load services.", setupNeeded: /services/.test(error.message) });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const checked = validateServiceInput(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });

    const { data: existing, error: listError } = await supabase.from("services").select("id, sort_order");
    if (listError) return res.status(500).json({ error: "Could not save the service." });
    if (existing.length >= MAX_SERVICES) return res.status(400).json({ error: `You can have up to ${MAX_SERVICES} services.` });
    const next = existing.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1;

    const { data, error } = await supabase
      .from("services")
      .insert({ ...checked.values, user_id: user.id, sort_order: checked.values.sort_order ?? next })
      .select("*")
      .single();
    if (error) {
      console.error("service create failed:", error.message);
      return res.status(500).json({ error: "Could not save the service." });
    }
    return res.status(201).json(data);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
