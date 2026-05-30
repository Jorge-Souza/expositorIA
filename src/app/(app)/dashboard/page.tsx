import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Video, Coins, ImageIcon, Film, ArrowRight, Plus } from "lucide-react"
import type { Profile, Geracao } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: geracoes }] = await Promise.all([
    adminClient.from("profiles").select("*").eq("id", user.id).single(),
    adminClient
      .from("geracoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ])

  const p = profile as Profile | null
  const lista = (geracoes ?? []) as Geracao[]

  const totalImagens = lista.filter((g) => g.status === "concluido" && g.tipo !== "video").length
  const totalVideos  = lista.filter((g) => g.status === "concluido" && g.tipo === "video").length

  const recentes = lista.filter(
    (g) => g.status === "concluido" && (g.imagens_geradas?.length > 0 || g.video_url)
  ).slice(0, 6)

  const primeiroNome = p?.nome?.split(" ")[0] ?? "Seller"
  const isAdmin = user.email === "jorge.expdigital@gmail.com"

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-sm text-violet-300/80 font-medium mb-1">Bem-vindo de volta</p>
          <h1 className="text-3xl font-bold mb-4">Olá, {primeiroNome}! 👋</h1>

          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Créditos</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{p?.credits ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-muted-foreground">Imagens</span>
              </div>
              <p className="text-3xl font-bold text-violet-400">{totalImagens}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Film className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Vídeos</span>
              </div>
              <p className="text-3xl font-bold text-cyan-400">{totalVideos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/gerar" className="group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-purple-700/20 p-6 hover:border-violet-500/60 hover:from-violet-600/30 hover:to-purple-700/30 transition-all">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-2">Fotos com IA</p>
          <h2 className="text-xl font-bold mb-1">Gerar Imagens</h2>
          <p className="text-sm text-muted-foreground mb-4">Fotos profissionais do seu produto em segundos</p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 group-hover:gap-2.5 transition-all">
            Criar agora <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link href="/gerar-video" className="group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-600/20 to-teal-700/20 p-6 hover:border-cyan-500/60 hover:from-cyan-600/30 hover:to-teal-700/30 transition-all">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Beta</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Video className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-2">Vídeos com IA</p>
          <h2 className="text-xl font-bold mb-1">Gerar Vídeos</h2>
          <p className="text-sm text-muted-foreground mb-4">Vídeos animados para TikTok e Reels</p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 group-hover:gap-2.5 transition-all">
            Criar agora <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Créditos zerados */}
      {(p?.credits ?? 0) === 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-yellow-400">Seus créditos acabaram</p>
            <p className="text-sm text-muted-foreground">Compre mais para continuar gerando</p>
          </div>
          <Button asChild variant="gradient" size="sm">
            <Link href="/creditos">Comprar créditos</Link>
          </Button>
        </div>
      )}

      {/* Gerações recentes */}
      {recentes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Gerações Recentes</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/historico">
                Ver histórico <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentes.map((g) => {
              const isVideo = g.tipo === "video"
              const thumb = isVideo
                ? (g.imagem_original_url ?? null)
                : (g.imagens_geradas?.[0] ?? null)

              return (
                <Link
                  key={g.id}
                  href="/historico"
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted hover:border-primary/50 transition-colors"
                >
                  {thumb ? (
                    <img src={thumb} alt={g.estilo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <Film className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                    <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{g.estilo}</p>
                  </div>
                </Link>
              )
            })}

            {/* Botão novo */}
            <Link
              href="/gerar"
              className="aspect-square rounded-xl border border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted transition-colors"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Novo</span>
            </Link>
          </div>
        </div>
      )}

      {lista.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Sua primeira geração te espera</p>
            <p className="text-sm text-muted-foreground">Faça upload de um produto e veja a mágica acontecer</p>
          </div>
          <Button asChild variant="gradient">
            <Link href="/gerar">Gerar agora</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
