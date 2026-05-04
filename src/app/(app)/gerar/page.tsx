"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Box, Users, Trees, ChevronLeft, ImageIcon, X,
  Zap, Monitor, Sparkles, Check, Loader2, Coins,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CREDITOS_TABELA, TIPOS_PRODUTO, CENARIOS, ILUMINACOES, ANGULOS, FORMATOS, MODELOS_IA,
  type EstiloFoto, type TipoProduto, type TipoGeracao,
  type FormatoFoto, type Qualidade, type QuantidadeImagens,
  type Cenario, type Iluminacao, type AnguloCamera, type ModeloIA,
} from "@/lib/types"

// ---------- tipos de estado ----------
interface GerarState {
  estilo: EstiloFoto | null
  imagem: File | null
  preview: string | null
  tipoProduto: TipoProduto | null
  tipoGeracao: TipoGeracao
  formato: FormatoFoto
  qualidade: Qualidade
  quantidade: QuantidadeImagens
  cenario: Cenario
  iluminacao: Iluminacao
  angulo: AnguloCamera
  modelo: ModeloIA
  referencia: File | null
  observacoes: string
}

const INITIAL: GerarState = {
  estilo: null,
  imagem: null,
  preview: null,
  tipoProduto: null,
  tipoGeracao: "produto_unico",
  formato: "1:1",
  qualidade: "1K",
  quantidade: 1,
  cenario: "marmore",
  iluminacao: "estudio_neutro",
  angulo: "frontal",
  modelo: "gemini-2.5-flash-image",
  referencia: null,
  observacoes: "",
}

// ---------- helpers visuais ----------
const ESTILOS_FOTO = [
  { id: "fundo_branco" as EstiloFoto, icon: Box,   label: "Fundo branco",    desc: "Catálogo limpo e profissional" },
  { id: "ambientada"   as EstiloFoto, icon: Trees,  label: "Foto ambientada", desc: "Produto em cena / lifestyle" },
  { id: "com_modelo"   as EstiloFoto, icon: Users,  label: "Com modelo",      desc: "Produto vestido ou em uso" },
]

const QUALIDADES = [
  { id: "1K" as Qualidade, icon: Zap,      label: "Rápida (1K)",       desc: "Alto volume · geração veloz" },
  { id: "2K" as Qualidade, icon: Monitor,  label: "Alta Qualidade (2K)",desc: "E-commerce e impressões" },
  { id: "4K" as Qualidade, icon: Sparkles, label: "Ultra HD (4K)",     desc: "Catálogos premium" },
]

const QUANTIDADES: QuantidadeImagens[] = [1, 3, 5]

function calcCreditos(q: Qualidade, n: QuantidadeImagens) {
  return CREDITOS_TABELA[q][n]
}

// ---------- componente principal ----------
export default function GerarPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [state, setState] = useState<GerarState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [gerandoImagens, setGerandoImagens] = useState<string[]>([])
  const [gerandoTotal, setGerandoTotal] = useState(0)
  const [geracaoId, setGeracaoId] = useState<string | null>(null)
  const [gerandoErros, setGerandoErros] = useState<string[]>([])

  function set<K extends keyof GerarState>(key: K, value: GerarState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return }
    set("imagem", file)
    set("preview", URL.createObjectURL(file))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  const creditos = calcCreditos(state.qualidade, state.quantidade)

  async function handleGerar() {
    if (!state.imagem || !state.tipoProduto || !state.estilo) return
    setLoading(true)
    setGerandoImagens([])
    setGeracaoId(null)
    setGerandoErros([])

    const form = new FormData()
    form.append("imagem", state.imagem)
    form.append("estilo", state.estilo)
    form.append("tipoProduto", state.tipoProduto)
    form.append("tipoGeracao", state.tipoGeracao)
    form.append("formato", state.formato)
    form.append("qualidade", state.qualidade)
    form.append("quantidade", String(state.quantidade))
    form.append("cenario", state.cenario)
    form.append("iluminacao", state.iluminacao)
    form.append("angulo", state.angulo)
    form.append("observacoes", state.observacoes)
    form.append("modelo", state.modelo)
    if (state.referencia) form.append("referencia", state.referencia)

    try {
      const res = await fetch("/api/gerar", { method: "POST", body: form })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Erro ao gerar imagens")
        setLoading(false)
        return
      }

      // Lê o stream SSE — imagens aparecem conforme são geradas
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === "inicio") {
              setGeracaoId(data.geracaoId)
              setGerandoTotal(data.total)
            } else if (data.type === "imagem") {
              setGerandoImagens((prev) => [...prev, data.url])
            } else if (data.type === "erro_imagem") {
              const msg = data.mensagem ?? "Erro ao gerar imagem"
              setGerandoErros((prev) => [...prev, msg])
            } else if (data.type === "concluido") {
              setLoading(false)
              if (data.total > 0) {
                toast.success(`${data.total} imagem(ns) gerada(s) com sucesso!`)
              } else {
                toast.error("Nenhuma imagem foi gerada")
              }
            }
          } catch {}
        }
      }
    } catch {
      toast.error("Erro ao gerar imagens. Tente novamente.")
      setLoading(false)
    }
  }

  // tela de geração ao vivo
  if (loading || gerandoImagens.length > 0 || gerandoErros.length > 0) return (
    <div className="space-y-6 pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          {loading ? "Gerando suas imagens..." : "Imagens geradas!"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {loading
            ? `${gerandoImagens.length} de ${gerandoTotal || state.quantidade} imagem(ns) concluída(s)`
            : `${gerandoImagens.length} imagem(ns) pronta(s)`}
        </p>
        {loading && (
          <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${(gerandoImagens.length / (gerandoTotal || state.quantidade)) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Imagens já geradas */}
        {gerandoImagens.map((url, i) => (
          <div key={i} className="relative group rounded-2xl overflow-hidden border border-border">
            <img src={url} alt={`Imagem ${i + 1}`} className="w-full aspect-square object-cover" />
            <a
              href={url}
              download={`expositorIA_${i + 1}.jpg`}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
            >
              Baixar
            </a>
          </div>
        ))}
        {/* Placeholders para imagens ainda em geração */}
        {loading && Array.from({ length: (gerandoTotal || state.quantidade) - gerandoImagens.length }).map((_, i) => (
          <div key={`loading-${i}`} className="rounded-2xl border border-border bg-muted aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Gerando...</span>
          </div>
        ))}
      </div>

      {gerandoErros.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-1">
          <p className="text-sm font-semibold text-destructive">Erros da API:</p>
          {gerandoErros.map((e, i) => (
            <p key={i} className="text-xs text-destructive/80 font-mono break-all">{e}</p>
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setGerandoImagens([]); setGerandoErros([]); setGeracaoId(null); setStep(0); setState(INITIAL) }}>
            Gerar novamente
          </Button>
          <Button variant="gradient" onClick={() => router.push("/historico")}>
            Ver histórico
          </Button>
        </div>
      )}
    </div>
  )

  // barra inferior fixa
  const BottomBar = () => (
    <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {(["1K","2K","4K"] as Qualidade[]).map((q) => (
          <span key={q}>
            {q}: <span className="text-foreground font-medium">{CREDITOS_TABELA[q][state.quantidade]} créditos</span>
          </span>
        ))}
      </div>
      {step < 2 ? (
        <Button
          variant="gradient" size="lg"
          disabled={
            (step === 0 && !state.estilo) ||
            (step === 1 && (!state.imagem || !state.tipoProduto))
          }
          onClick={() => setStep((s) => s + 1)}
        >
          Continuar
        </Button>
      ) : (
        <Button
          variant="gradient" size="lg"
          disabled={loading || !state.imagem || !state.tipoProduto}
          onClick={handleGerar}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
            : <><Sparkles className="h-4 w-4" /> Gerar {state.quantidade} imagens · {creditos} créditos</>
          }
        </Button>
      )}
    </div>
  )

  // ---------- STEP 0 — estilo ----------
  if (step === 0) return (
    <div className="pb-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Qual estilo de foto você deseja?</h1>
          <p className="text-muted-foreground">Escolha o estilo ideal para seus produtos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ESTILOS_FOTO.map(({ id, icon: Icon, label, desc, breve }) => (
            <button
              key={id}
              onClick={() => { if (!breve) { set("estilo", id); setStep(1) } }}
              disabled={!!breve}
              className={cn(
                "relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 text-center transition-all",
                breve
                  ? "border-border opacity-50 cursor-not-allowed"
                  : state.estilo === id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent cursor-pointer"
              )}
            >
              {breve && (
                <span className="absolute top-3 right-3 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Em breve
                </span>
              )}
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Icon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-base">{label}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomBar />
    </div>
  )

  // ---------- STEP 1 — upload + produto ----------
  if (step === 1) return (
    <div className="pb-20 space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(0)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Envie a foto do produto</h1>
          <p className="text-muted-foreground text-sm">Envie uma foto clara, bem iluminada</p>
        </div>
        <button
          onClick={() => setStep(0)}
          className="ml-auto flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
        >
          {ESTILOS_FOTO.find((e) => e.id === state.estilo)?.label}
          <span className="text-muted-foreground text-xs">· Alterar</span>
        </button>
      </div>

      {/* upload */}
      {state.preview ? (
        <div className="relative max-w-sm">
          <img src={state.preview} alt="preview" className="w-full aspect-square object-contain rounded-2xl border border-border bg-muted" />
          <button
            onClick={() => { set("imagem", null); set("preview", null) }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "w-full max-w-lg aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
          )}
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Arraste suas fotos aqui</p>
            <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar do seu dispositivo</p>
          </div>
          <p className="text-xs text-muted-foreground">📸 Foto clara e bem iluminada · 💡 Evite fotos escuras · PNG, JPG, WEBP · máx 10MB</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* tipo de produto */}
      <div className="space-y-3">
        <h2 className="font-semibold">Qual tipo de produto é este?</h2>
        <p className="text-sm text-muted-foreground">Selecione o tipo para gerar com mais precisão</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIPOS_PRODUTO.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => set("tipoProduto", id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
                state.tipoProduto === id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* tipo de geração (só para ambientada) */}
      {state.estilo === "ambientada" && (
        <div className="space-y-3">
          <h2 className="font-semibold">Tipo de geração</h2>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { id: "produto_unico" as TipoGeracao, label: "Produto único", desc: "Um produto no cenário" },
              { id: "conjunto"      as TipoGeracao, label: "Conjunto",      desc: "Vários produtos juntos" },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => set("tipoGeracao", id)}
                className={cn(
                  "flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all",
                  state.tipoGeracao === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
                )}
              >
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  )

  // ---------- STEP 2 — configurar ----------
  return (
    <div className="pb-24 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Configure sua geração</h1>
          <p className="text-sm text-muted-foreground">Formato, qualidade e cenário</p>
        </div>
      </div>

      {/* formato */}
      <div className="space-y-4">
        <h2 className="font-semibold">Formato da foto</h2>
        {["QUADRADO", "VERTICAL", "HORIZONTAL"].map((grupo) => {
          const items = FORMATOS.filter((f) => f.grupo === grupo)
          return (
            <div key={grupo} className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium tracking-wider">{grupo}</p>
              <div className="flex flex-wrap gap-2">
                {items.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => set("formato", id)}
                    className={cn(
                      "flex flex-col p-3 rounded-xl border-2 text-left min-w-[130px] transition-all",
                      state.formato === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    <span className={cn("font-semibold text-sm", state.formato === id ? "text-primary" : "")}>{label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* qualidade */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold">Qualidade da imagem</h2>
          <p className="text-sm text-muted-foreground">Imagens em maior resolução consomem mais créditos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUALIDADES.map(({ id, icon: Icon, label, desc }) => {
            const custo = CREDITOS_TABELA[id][state.quantidade]
            return (
              <button
                key={id}
                onClick={() => set("qualidade", id)}
                className={cn(
                  "relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all",
                  state.qualidade === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className={cn("h-5 w-5", state.qualidade === id ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-medium text-muted-foreground">{custo} créditos</span>
                </div>
                <span className={cn("font-semibold text-sm", state.qualidade === id ? "text-primary" : "")}>{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* quantidade */}
      <div className="space-y-3">
        <h2 className="font-semibold">Quantidade de variações</h2>
        <div className="flex gap-3">
          {QUANTIDADES.map((n) => (
            <button
              key={n}
              onClick={() => set("quantidade", n)}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border-2 min-w-[90px] transition-all",
                state.quantidade === n ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className={cn("text-2xl font-bold", state.quantidade === n ? "text-primary" : "")}>{n}</span>
              <span className="text-xs text-muted-foreground mt-1">{calcCreditos(state.qualidade, n)} créditos</span>
            </button>
          ))}
        </div>
      </div>

      {/* cenário (só para ambientada) */}
      {state.estilo === "ambientada" && (
        <div className="space-y-5">
          <h2 className="font-semibold">Opções de cenário</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* cenário */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Cenário</label>
              <div className="flex flex-col gap-1.5">
                {CENARIOS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => set("cenario", id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                      state.cenario === id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {state.cenario === id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className={state.cenario === id ? "" : "ml-5"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* iluminação */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Iluminação</label>
              <div className="flex flex-col gap-1.5">
                {ILUMINACOES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => set("iluminacao", id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                      state.iluminacao === id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {state.iluminacao === id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className={state.iluminacao === id ? "" : "ml-5"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ângulo */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Ângulo de câmera</label>
              <div className="flex flex-col gap-1.5">
                {ANGULOS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => set("angulo", id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                      state.angulo === id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {state.angulo === id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className={state.angulo === id ? "" : "ml-5"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modelo de IA */}
      <div className="space-y-3">
        <h2 className="font-semibold">Modelo de IA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODELOS_IA.map(({ id, label, desc, badge }) => (
            <button
              key={id}
              onClick={() => set("modelo", id)}
              className={cn(
                "relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all",
                state.modelo === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              {badge && (
                <span className={cn(
                  "absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium",
                  badge === "Recomendado" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {badge}
                </span>
              )}
              <span className={cn("font-semibold text-sm", state.modelo === id ? "text-primary" : "")}>{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* foto de referência */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            Foto de referência
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </h2>
          <p className="text-sm text-muted-foreground">Use para manter o mesmo padrão visual em todas as fotos do catálogo</p>
        </div>
        {state.referencia ? (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <img
              src={URL.createObjectURL(state.referencia)}
              alt="referência"
              className="w-12 h-12 rounded-lg object-cover border border-border"
            />
            <span className="text-sm flex-1 truncate">{state.referencia.name}</span>
            <button onClick={() => set("referencia", null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => refInputRef.current?.click()}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent transition-colors w-full max-w-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">+ Adicionar foto de referência</span>
            <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) set("referencia", f) }} />
          </button>
        )}
      </div>

      {/* observações */}
      <div className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          Observações
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </h2>
        <div className="relative">
          <textarea
            value={state.observacoes}
            onChange={(e) => set("observacoes", e.target.value.slice(0, 500))}
            placeholder="Ex: fundo bege suave · sombra mais leve · ângulo mais fechado"
            rows={3}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{state.observacoes.length}/500</span>
        </div>
      </div>

      <BottomBar />
    </div>
  )
}
