import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

if (SUPABASE_URL.includes("YOUR_PROJECT_REF") || SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) {
  console.warn("Please update assets/js/supabase-config.js with real Supabase credentials.");
}

async function resolveSupabaseClient() {
  if (globalThis.__TEST_SUPABASE_CLIENT__) {
    return globalThis.__TEST_SUPABASE_CLIENT__;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = await resolveSupabaseClient();
