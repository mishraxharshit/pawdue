import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { validateServiceInput } from "../../../lib/services";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Invalid id" });

  if (req.method === "PATCH") {
    const checked = validateServiceInput(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const { data, error } = await supabase.from("services").update(checked.values).eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
    if (error) return res.status(500).json({ error: "Could not save the service." });
    if (!data) return res.status(404).json({ error: "Service not found" });
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("services").delete().eq("id", id).eq("user_id", user.id);
    if (error) return res.status(500).json({ error: "Could not delete the service." });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
