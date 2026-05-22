"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles, LayoutDashboard, History, Coins, LogOut, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/gerar", label: "Gerar Imagens", icon: Sparkles },
  { href: "/gerar-video", label: "Gerar Vídeos", icon: Video },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/creditos", label: "Créditos", icon: Coins },
]

interface SidebarProps {
  credits: number
  nomeUsuario: string | null
}

export function Sidebar({ credits, nomeUsuario }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    toast.success("Até logo!")
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 border-r border-border bg-card">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="text-base font-bold">
            expositor<span className="text-primary">IA</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Credits + user */}
      <div className="p-3 border-t border-border space-y-2">
        <Link
          href="/creditos"
          className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{credits} créditos</span>
          </div>
          <span className="text-xs text-primary font-semibold">+ Comprar</span>
        </Link>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground truncate max-w-[140px]">
            {nomeUsuario ?? "Usuário"}
          </span>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
