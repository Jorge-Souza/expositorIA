import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Sidebar } from "@/components/sidebar"
import type { Profile } from "@/lib/types"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const p = profile as Profile | null
  const credits = p?.credits ?? 0
  const nome = p?.nome ?? user.email?.split("@")[0] ?? null

  return (
    <div className="flex min-h-screen">
      <Sidebar credits={credits} nomeUsuario={nome} email={user.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {children}
        </div>
      </main>
    </div>
  )
}
