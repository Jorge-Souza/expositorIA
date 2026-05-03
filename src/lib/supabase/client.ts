import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vtrtvvcqhxputsnjlxei.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cnR2dmNxaHhwdXRzbmpseGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Nzk4MTQsImV4cCI6MjA5MzI1NTgxNH0.EnmsFREl_atZ38wHUeUZUEm2Tw682_ByWj0_Xi5pnoI"

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
