import { createClient } from "@/lib/supabase/server";

/** Nombres de quien registró cada movimiento; si no se pueden leer, el historial sale sin autor. */
export async function loadPeople(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, username");
  const people: Record<string, string> = {};
  for (const row of data ?? []) {
    const name = row.full_name?.trim() || row.username?.trim();
    if (name) people[row.id] = name;
  }
  return people;
}
