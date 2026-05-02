import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Images, Coins, ArrowRight, Zap } from "lucide-react"
import type { Profile, Geracao } from "@/lib/types"

function StatusBadge({ status }: { status: string }) {
  if (status === "concluido") return <Badge variant="success">Concluído</Badge>
  if (status === "processando") return <Badge>Processando</Badge>
  return <Badge variant="destructive">Erro</Badge>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: geracoes }] = await Promise.all([
    adminClient.from("profiles").select("*").eq("id", user.id).single(),
    adminClient
      .from("geracoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const p = profile as Profile | null
  const ultimasGeracoes = (geracoes ?? []) as Geracao[]
  const totalGeradas = ultimasGeracoes.filter((g) => g.status === "concluido").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {p?.nome?.split(" ")[0] ?? "Seller"} 👋</h1>
        <p className="text-muted-foreground">Pronto para criar imagens que vendem?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{p?.credits ?? 0}</p>
              <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Images className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGeradas}</p>
              <p className="text-sm text-muted-foreground">Gerações recentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">~30s</p>
              <p className="text-sm text-muted-foreground">Tempo por geração</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="border-primary/20 bg-gradient-to-r from-purple-500/5 to-violet-500/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Gerar novas imagens</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Faça upload da foto do seu produto e escolha o estilo
            </p>
          </div>
          <Button asChild variant="gradient" size="lg">
            <Link href="/gerar">
              <Sparkles className="h-4 w-4" />
              Gerar agora
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Últimas gerações */}
      {ultimasGeracoes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Últimas gerações</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/historico">
                Ver todas <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {ultimasGeracoes.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {g.imagens_geradas?.[0] ? (
                    <img
                      src={g.imagens_geradas[0]}
                      alt="preview"
                      className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center">
                      <Images className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{g.estilo}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.quantidade} imagens · {g.creditos_usados} créditos
                    </p>
                  </div>
                  <StatusBadge status={g.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sem créditos */}
      {(p?.credits ?? 0) === 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-yellow-400">Seus créditos acabaram</p>
              <p className="text-sm text-muted-foreground">Compre mais para continuar gerando imagens</p>
            </div>
            <Button asChild variant="gradient" size="sm">
              <Link href="/creditos">Comprar créditos</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
