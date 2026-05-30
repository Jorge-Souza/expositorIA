"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles, LayoutDashboard, History, Coins, LogOut, Video, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/gerar", label: "Gerar", icon: Sparkles },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/creditos", label: "Créditos", icon: Coins },
]

const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

interface SidebarProps {
  credits: number
  nomeUsuario: string | null
  email?: string | null
}

export function Sidebar({ credits, nomeUsuario, email }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = email === ADMIN_EMAIL

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    toast.success("Até logo!")
  }

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ href: "/gerar-video", label: "Vídeos", icon: Video }] : []),
  ]

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen sticky top-0 border-r border-border bg-card">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-center">
          <span className="text-lg font-bold tracking-tight">expositorIA</span>
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
          {isAdmin && (
            <Link
              href="/gerar-video"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === "/gerar-video"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Video className="h-4 w-4 shrink-0" />
              Gerar Vídeos
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 border border-primary/20",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-primary hover:bg-primary/10"
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Painel Admin
            </Link>
          )}
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

      {/* Top bar — mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <span className="text-base font-bold tracking-tight">expositorIA</span>
        <div className="flex items-center gap-3">
          <Link href="/creditos" className="flex items-center gap-1 text-sm font-medium text-primary">
            <Coins className="h-4 w-4" />
            {credits}
          </Link>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card pb-safe">
        {allNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
              pathname === href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
              pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <ShieldCheck className="h-5 w-5" />
            Admin
          </Link>
        )}
      </nav>
    </>
  )
}
