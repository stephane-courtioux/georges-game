import { createClient } from "@supabase/supabase-js";

// Le client Supabase, partagé par toute l'application.
// Les deux variables viennent de .env.local (NEXT_PUBLIC_ = lisibles côté navigateur).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !cle) {
  throw new Error(
    "Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquantes (voir .env.local)"
  );
}

export const supabase = createClient(url, cle);
