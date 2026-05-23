import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="font-bold">expositor<span className="text-primary">IA</span></span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
          <a href="/admin/clientes" className="text-muted-foreground hover:text-foreground transition-colors">Clientes</a>
          <a href="/dashboard" className="text-primary font-medium">← Voltar ao app</a>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {children}
      </main>
    </div>
  )
}
