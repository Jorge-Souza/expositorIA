"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, Plus, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Cliente {
  id: string
  email: string
  nome: string
  credits: number
  created_at: string
  imagens: number
  videos: number
  creditosUsados: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function exportCSV(clientes: Cliente[]) {
  const header = ["Nome", "Email", "Créditos atuais", "Imagens geradas", "Vídeos gerados", "Créditos usados", "Cadastro"]
  const rows = clientes.map((c) => [
    c.nome, c.email, c.credits, c.imagens, c.videos, c.creditosUsados, formatDate(c.created_at)
  ])
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `clientes_expositorIA_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("")
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null)
  const [creditosInput, setCreditosInput] = useState<Record<string, string>>({})
  const [lista, setLista] = useState(clientes)

  const filtrados = lista.filter((c) =>
    c.email.toLowerCase().includes(busca.toLowerCase()) ||
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  async function adicionarCreditos(clienteId: string) {
    const qtd = Number(creditosInput[clienteId])
    if (!qtd || qtd <= 0) { toast.error("Informe uma quantidade válida"); return }
    setAdicionandoId(clienteId)
    try {
      const res = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clienteId, creditos: qtd }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Erro ao adicionar créditos"); return }
      toast.success(`${qtd} créditos adicionados!`)
      setLista((prev) => prev.map((c) => c.id === clienteId ? { ...c, credits: data.novosCreditos } : c))
      setCreditosInput((prev) => ({ ...prev, [clienteId]: "" }))
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setAdicionandoId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button variant="outline" onClick={() => exportCSV(filtrados)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Imagens</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Vídeos</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Cr. usados</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Cr. atuais</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Adicionar créditos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum cliente encontrado</td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-center">{c.imagens}</td>
                <td className="px-4 py-3 text-center">{c.videos}</td>
                <td className="px-4 py-3 text-center">{c.creditosUsados}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "font-semibold",
                    c.credits === 0 ? "text-destructive" : c.credits < 5 ? "text-amber-500" : "text-primary"
                  )}>
                    {c.credits}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={creditosInput[c.id] ?? ""}
                      onChange={(e) => setCreditosInput((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-20 px-2 py-1.5 rounded-lg border border-border bg-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      onClick={() => adicionarCreditos(c.id)}
                      disabled={adicionandoId === c.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {adicionandoId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
