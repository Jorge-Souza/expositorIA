import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Images, Download, Loader2 } from "lucide-react"
import type { Geracao } from "@/lib/types"

function StatusBadge({ status }: { status: string }) {
  if (status === "concluido") return <Badge variant="success">Concluído</Badge>
  if (status === "processando") return <Badge>Processando</Badge>
  return <Badge variant="destructive">Erro</Badge>
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-muted-foreground">{lista.length} geração{lista.length !== 1 ? "ões" : ""} realizadas</p>
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <Images className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhuma geração ainda</p>
              <p className="text-sm text-muted-foreground">Suas imagens geradas vão aparecer aqui</p>
            </div>
            <Button asChild variant="gradient" size="sm">
              <a href="/gerar">Gerar agora</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lista.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Imagens */}
                  <div className="flex gap-2 shrink-0">
                    {(g.imagens_geradas ?? []).slice(0, 3).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`gerada ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-border"
                      />
                    ))}
                    {(g.imagens_geradas?.length ?? 0) > 3 && (
                      <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          +{g.imagens_geradas.length - 3}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{g.estilo}</p>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.quantidade} variações · {g.creditos_usados} créditos · {formatDate(g.created_at)}
                    </p>
                    {g.erro && (
                      <p className="text-xs text-destructive mt-1">{g.erro}</p>
                    )}
                  </div>

                  {/* Download */}
                  {g.status === "concluido" && g.imagens_geradas?.length > 0 && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {g.imagens_geradas.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          download={`imagem-${i + 1}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          img {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid de imagens (todas) */}
                {g.status === "concluido" && (g.imagens_geradas?.length ?? 0) > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                    {g.imagens_geradas.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`variação ${i + 1}`}
                          className="w-full aspect-square rounded-lg object-cover border border-border hover:border-primary transition-colors"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
