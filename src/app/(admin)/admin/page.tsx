import { createAdminClient } from "@/lib/supabase/admin"
import { Users, Image, Video, Coins } from "lucide-react"

export default async function AdminPage() {
  const adminClient = createAdminClient()

  const [{ data: profiles }, { data: geracoes }] = await Promise.all([
    adminClient.from("profiles").select("id, credits, created_at"),
    adminClient.from("geracoes").select("id, creditos_usados, tipo, status, created_at"),
  ])

  const totalClientes = profiles?.length ?? 0
  const totalGeracoes = geracoes?.filter((g) => g.tipo !== "video").length ?? 0
  const totalVideos = geracoes?.filter((g) => g.tipo === "video").length ?? 0
  const totalCreditosVendidos = profiles?.reduce((acc, p) => {
    // créditos iniciais (5) + créditos comprados = créditos atuais + créditos usados
    return acc
  }, 0)

  const creditosUsados = geracoes?.reduce((acc, g) => acc + (g.creditos_usados ?? 0), 0) ?? 0

  const stats = [
    { label: "Clientes cadastrados", value: totalClientes, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Imagens geradas", value: totalGeracoes, icon: Image, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Vídeos gerados", value: totalVideos, icon: Video, color: "text-pink-500", bg: "bg-pink-500/10" },
    { label: "Créditos consumidos", value: creditosUsados, icon: Coins, color: "text-amber-500", bg: "bg-amber-500/10" },
  ]

  // Últimos 7 dias de cadastros
  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
  const novosClientes = profiles?.filter((p) => new Date(p.created_at) >= seteDiasAtras).length ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">{novosClientes} novo(s) cliente(s) nos últimos 7 dias</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Acesso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/admin/clientes"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Lista de clientes</p>
              <p className="text-xs text-muted-foreground">Ver todos, exportar CSV, adicionar créditos</p>
            </div>
          </a>
          <a
            href="/dashboard"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
          >
            <Image className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Voltar ao app</p>
              <p className="text-xs text-muted-foreground">Acessar como cliente</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
