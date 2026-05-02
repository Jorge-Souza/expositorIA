"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  packId: string
  destaque?: boolean
}

export function CreditoCheckoutButton({ packId, destaque }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleComprar() {
    setLoading(true)
    const res = await fetch("/api/creditos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    })
    const json = await res.json()
    if (!res.ok || !json.url) {
      toast.error("Erro ao iniciar pagamento")
      setLoading(false)
      return
    }
    window.location.href = json.url
  }

  return (
    <Button
      onClick={handleComprar}
      variant={destaque ? "gradient" : "outline"}
      className="w-full"
      disabled={loading}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Comprar
    </Button>
  )
}
