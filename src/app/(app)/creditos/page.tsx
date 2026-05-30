import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditoCheckoutButton } from "@/components/credito-checkout-button"
import { Coins, Check, Zap } from "lucide-react"
import { PACKS } from "@/lib/types"
import { formatBRL } from "@/lib/utils"
import type { Profile } from "@/lib/types"

export default async function CreditosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  const p = profile as Pick<Profile, "credits"> | null
  const credits = p?.credits ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Créditos</h1>
        <p className="text-muted-foreground">Compre créditos para gerar mais imagens</p>
      </div>

      {/* Saldo atual */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold">{credits}</p>
            <p className="text-muted-foreground text-sm">créditos disponíveis</p>
          </div>
        </CardContent>
      </Card>

      {/* Como funciona */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <p className="font-medium text-sm">Como funciona</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              { n: "3", label: "créditos para gerar 3 imagens" },
              { n: "5", label: "créditos para gerar 5 imagens" },
              { n: "9", label: "créditos para gerar 9 imagens" },
            ].map((item) => (
              <div key={item.n} className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold text-primary">{item.n}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Packs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PACKS.map((pack) => (
          <Card
            key={pack.id}
            className={pack.destaque ? "border-primary/40 relative overflow-hidden" : ""}
          >
            {pack.destaque && (
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500" />
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{pack.nome}</CardTitle>
                {pack.destaque && <Badge>Mais popular</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  {formatBRL(pack.preco / 100)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{pack.creditos} créditos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    Até {Math.floor(pack.creditos / 3)} gerações de 3 imgs
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Sem prazo de validade</span>
                </div>
              </div>
              <CreditoCheckoutButton packId={pack.id} destaque={pack.destaque} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
