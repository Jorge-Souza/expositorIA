import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Zap, ShieldCheck, TrendingUp } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <img src="/logo-expositorIA1.png" alt="expositorIA" className="h-14 w-auto object-contain" />
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/cadastro">Começar grátis</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Imagens profissionais em segundos
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold max-w-3xl leading-tight">
          Transforme suas fotos de produto em{" "}
          <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
            imagens que vendem
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl">
          Faça upload da foto do seu produto e nossa IA gera até 9 variações profissionais
          prontas para o TikTok Shop e e-commerce em menos de 30 segundos.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button asChild variant="gradient" size="xl">
            <Link href="/cadastro">
              <Sparkles className="h-4 w-4" />
              Gerar imagens grátis
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">5 créditos grátis ao criar conta · sem cartão</p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-3xl w-full text-left">
          {[
            {
              icon: Zap,
              title: "Geração em 30 segundos",
              desc: "Nossa IA processa sua foto e gera variações profissionais em instantes.",
            },
            {
              icon: TrendingUp,
              title: "Otimizado para TikTok Shop",
              desc: "Estilos criados especialmente para converter nas plataformas de social commerce.",
            },
            {
              icon: ShieldCheck,
              title: "Créditos sem prazo",
              desc: "Compre uma vez, use quando quiser. Seus créditos nunca expiram.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2025 expositorIA · Todos os direitos reservados
      </footer>
    </div>
  )
}
