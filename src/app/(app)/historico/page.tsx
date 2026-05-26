import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ImageIcon, Film, Download, Sparkles, Calendar, Coins } from "lucide-react"
import type { Geracao } from "@/lib/types"

function StatusBadge({ status }: { status: string }) {
  if (status === "concluido") return <Badge variant="success">Concluído</Badge>
  if (status === "processando") return <Badge>Processando</Badge>
  return <Badge variant="destructive">Erro</Badge>
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default async function HistoricoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const { data: geracoes } = await adminClient
    .from("geracoes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const lista = (geracoes ?? []) as Geracao[]

  const totalImagens = lista.filter((g) => g.tipo !== "video" && g.status === "concluido").length
  const totalVideos  = lista.filter((g) => g.tipo === "video"  && g.status === "concluido").length
  const totalCreditos = lista.reduce((s, g) => s + (g.creditos_usados ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm">{lista.length} geração{lista.length !== 1 ? "ões" : ""} realizadas</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="gradient" size="sm">
            <Link href="/gerar"><Sparkles className="h-4 w-4" /> Nova imagem</Link>
          </Button>
          <Button asChild size="sm" className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20">
            <Link href="/gerar-video"><Film className="h-4 w-4" /> Novo vídeo</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <ImageIcon className="h-4 w-4 text-violet-400" />
            <span className="text-xs">Imagens geradas</span>
          </div>
          <p className="text-2xl font-bold text-violet-400">{totalImagens}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <Film className="h-4 w-4 text-cyan-400" />
            <span className="text-xs">Vídeos gerados</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{totalVideos}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="text-xs">Créditos usados</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{totalCreditos}</p>
        </div>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma geração ainda</p>
            <p className="text-sm text-muted-foreground">Suas imagens e vídeos gerados vão aparecer aqui</p>
          </div>
          <Button asChild variant="gradient" size="sm">
            <Link href="/gerar">Gerar agora</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((g) => {
            const isVideo = g.tipo === "video"
            const thumbs = isVideo
              ? (g.video_url ? [] : [])
              : (g.imagens_geradas ?? [])

            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header do card */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVideo ? "bg-cyan-500/10" : "bg-violet-500/10"}`}>
                    {isVideo
                      ? <Film className="h-4 w-4 text-cyan-400" />
                      : <ImageIcon className="h-4 w-4 text-violet-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{g.estilo}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(g.created_at)}</span>
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3" />{g.creditos_usados} créditos</span>
                      {!isVideo && <span>{g.quantidade} variações</span>}
                    </div>
                  </div>
                  <StatusBadge status={g.status} />
                </div>

                {/* Conteúdo */}
                {g.status === "concluido" && (
                  <div className="p-4">
                    {isVideo && g.video_url ? (
                      <div className="flex items-start gap-4">
                        <div className="relative rounded-xl overflow-hidden border border-border bg-muted shrink-0" style={{ width: 120, height: 160 }}>
                          {g.imagem_original_url ? (
                            <img src={g.imagem_original_url} alt="produto" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                              <Film className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <a
                            href={g.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300"
                          >
                            <Film className="h-4 w-4" /> Assistir vídeo
                          </a>
                          <a
                            href={g.video_url}
                            download="video.mp4"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" /> Baixar MP4
                          </a>
                        </div>
                      </div>
                    ) : thumbs.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
                        {thumbs.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                            <img
                              src={url}
                              alt={`variação ${i + 1}`}
                              className="w-full aspect-square rounded-xl object-cover border border-border group-hover:border-primary/60 transition-colors"
                            />
                            <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Download className="h-4 w-4 text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {g.status === "erro" && g.erro && (
                  <div className="px-5 py-3">
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{g.erro}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
