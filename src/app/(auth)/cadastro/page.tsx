"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha || !nome) return
    if (senha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres")
      return
    }
    setLoading(true)

    const res = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, nome }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Erro ao criar conta")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (loginError) {
      toast.error(loginError.message)
      setLoading(false)
      return
    }

    toast.success("Conta criada! Você ganhou 5 créditos grátis para começar.")
    router.push("/dashboard")
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Ganhe 5 créditos grátis ao se cadastrar</CardDescription>
      </CardHeader>
      <form onSubmit={handleCadastro}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Seu nome</Label>
            <Input
              id="nome"
              placeholder="João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar conta grátis
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
