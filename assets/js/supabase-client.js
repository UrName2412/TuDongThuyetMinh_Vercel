import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

if (!SUPABASE_URL.includes("YOUR_PROJECT_REF") || !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) {
  // noop
} else {
  console.warn("Please update assets/js/supabase-config.js with real Supabase credentials.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
