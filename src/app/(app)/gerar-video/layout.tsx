import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

export default async function GerarVideoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
