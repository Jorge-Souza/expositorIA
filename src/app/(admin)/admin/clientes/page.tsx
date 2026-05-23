import { createAdminClient } from "@/lib/supabase/admin"
import { ClientesTable } from "./clientes-table"

export default async function ClientesPage() {
  const adminClient = createAdminClient()

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, email, nome, credits, created_at")
    .order("created_at", { ascending: false })

  const { data: geracoes } = await adminClient
    .from("geracoes")
    .select("user_id, creditos_usados, tipo, status")

  // Agrupa gerações por usuário
  const statsMap: Record<string, { imagens: number; videos: number; creditosUsados: number }> = {}
  for (const g of geracoes ?? []) {
    if (!statsMap[g.user_id]) statsMap[g.user_id] = { imagens: 0, videos: 0, creditosUsados: 0 }
    if (g.tipo === "video") statsMap[g.user_id].videos++
    else statsMap[g.user_id].imagens++
    statsMap[g.user_id].creditosUsados += g.creditos_usados ?? 0
  }

  const clientes = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    nome: p.nome ?? "—",
    credits: p.credits,
    created_at: p.created_at,
    imagens: statsMap[p.id]?.imagens ?? 0,
    videos: statsMap[p.id]?.videos ?? 0,
    creditosUsados: statsMap[p.id]?.creditosUsados ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">{clientes.length} cadastrado(s)</p>
        </div>
      </div>
      <ClientesTable clientes={clientes} />
    </div>
  )
}
