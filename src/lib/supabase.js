import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ""
).trim();
const syncSetting = import.meta.env.VITE_ENABLE_SUPABASE_SYNC?.trim();

function isPlaceholder(value) {
  return !value || value.includes("your-") || value.includes("example");
}

const hasSupabaseCredentials =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey);

export const isSupabaseSyncEnabled =
  syncSetting === "true" ||
  (syncSetting !== "false" && hasSupabaseCredentials);

export const isSupabaseConfigured = Boolean(
  isSupabaseSyncEnabled && hasSupabaseCredentials,
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
