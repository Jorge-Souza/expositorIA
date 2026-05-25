"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  ChevronLeft, ImageIcon, X, Loader2, Video,
  Download, User, Users, Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  MODELOS_INSPIRACAO, MOVIMENTOS_VIDEO,
  type ModeloInspiracao, type MovimentoVideo, type AspectRatioVideo, type DuracaoVideo,
} from "@/lib/types"

const CREDITOS_POR_VIDEO = 10

type Modo = "feminino" | "masculino" | "foco"

interface VideoState {
  imagem: File | null
  preview: string | null
  modo: Modo | null
  modelo: ModeloInspiracao | null
  movimento: MovimentoVideo | null
  aspecto: AspectRatioVideo
  duracao: DuracaoVideo
}

const INITIAL: VideoState = {
  imagem: null,
  preview: null,
  modo: null,
  modelo: null,
  movimento: null,
  aspecto: "9:16",
  duracao: 5,
}

const FORMATOS: { id: AspectRatioVideo; label: string; desc: string }[] = [
  { id: "9:16", label: "9:16 Vertical", desc: "TikTok, Reels" },
  { id: "1:1",  label: "1:1 Quadrado",  desc: "Feed, TikTok Shop" },
  { id: "4:5",  label: "4:5 Instagram", desc: "Feed Instagram" },
]

export default function GerarVideoPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [state, setState] = useState<VideoState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState<"processando" | "concluido" | "erro" | null>(null)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<"imagem" | "video" | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function set<K extends keyof VideoState>(key: K, value: VideoState[K]) {
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

  useEffect(() => {
    if (!videoId || pollingStatus !== "processando") return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/gerar-video/status?videoId=${videoId}`)
        const data = await res.json()
        if (data.status === "concluido") {
          setVideoUrl(data.videoUrl)
          setPollingStatus("concluido")
          setLoading(false)
          clearInterval(pollRef.current!)
          toast.success("Vídeo gerado com sucesso!")
        } else if (data.status === "erro") {
          setErroMsg(data.erro ?? "Erro ao gerar vídeo")
          setPollingStatus("erro")
          setLoading(false)
          clearInterval(pollRef.current!)
        }
        if (data.etapa) setEtapa(data.etapa)
      } catch {}
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [videoId, pollingStatus])

  async function handleGerar() {
    if (!state.imagem || !state.modo || !state.movimento) return
    if (state.modo !== "foco" && !state.modelo) return
    setLoading(true)
    setVideoId(null)
    setVideoUrl(null)
    setPollingStatus(null)
    setErroMsg(null)
    setEtapa(state.modo === "foco" ? "video" : "imagem")

    const form = new FormData()
    form.append("imagem", state.imagem)
    form.append("modo", state.modo)
    form.append("motionId", state.movimento.motionId)
    form.append("movimentoLabel", state.movimento.label)
    form.append("aspecto", state.aspecto)
    form.append("duracao", String(state.duracao))
    if (state.modelo) {
      form.append("modeloDescricao", state.modelo.descricao)
      form.append("modeloLabel", state.modelo.label)
    }

    try {
      const res = await fetch("/api/gerar-video", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Erro ao iniciar geração"); setLoading(false); return }
      setVideoId(data.videoId)
      setPollingStatus("processando")
      if (state.modo !== "foco") setEtapa("video")
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  function resetar() {
    setLoading(false); setPollingStatus(null); setVideoId(null)
    setVideoUrl(null); setErroMsg(null); setEtapa(null)
    setState(INITIAL); setStep(0)
  }

  function selecionarModo(modo: Modo) {
    setState((s) => ({ ...s, modo, modelo: null }))
  }

  // Tela de geração / resultado
  if (loading || pollingStatus) return (
    <div className="space-y-8 pb-8 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          {pollingStatus === "concluido" ? "Vídeo pronto!" : pollingStatus === "erro" ? "Erro na geração" : "Criando seu vídeo..."}
        </h1>
        <p className="text-muted-foreground text-sm">
          {pollingStatus === "concluido" ? "Seu vídeo foi gerado com sucesso"
            : pollingStatus === "erro" ? erroMsg
            : etapa === "imagem" ? "Etapa 1/2 · Gemini está gerando a imagem com a modelo..."
            : state.modo === "foco" ? "Higgsfield está animando seu produto (1-2 min)..."
            : "Etapa 2/2 · Higgsfield está animando o vídeo (1-2 min)..."}
        </p>
      </div>

      {pollingStatus === "processando" && (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border">
            {state.preview && <img src={state.preview} alt="produto" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
          {state.modo !== "foco" && (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={cn(etapa === "imagem" ? "text-primary font-medium" : "")}>1. Gerar imagem</span>
                <span className={cn(etapa === "video" ? "text-primary font-medium" : "")}>2. Animar vídeo</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={cn("h-full bg-primary transition-all duration-700", etapa === "imagem" ? "w-1/4 animate-pulse" : "w-3/4 animate-pulse")} />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {state.modelo ? `Modelo: ${state.modelo.label} · ` : ""}
            Movimento: {state.movimento?.label}
          </p>
        </div>
      )}

      {pollingStatus === "concluido" && videoUrl && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-[9/16] max-w-xs mx-auto">
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-3 justify-center">
            <a href={videoUrl} download="expositorIA_video.mp4" target="_blank" rel="noopener noreferrer">
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />Baixar vídeo</Button>
            </a>
            <Button variant="gradient" onClick={resetar}>Gerar outro</Button>
          </div>
        </div>
      )}

      {pollingStatus === "erro" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">Erro:</p>
            <p className="text-xs text-destructive/80 font-mono break-all mt-1">{erroMsg}</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={resetar}>Tentar novamente</Button>
          </div>
        </div>
      )}
    </div>
  )

  const canContinueStep0 = !!state.imagem
  const canContinueStep1 = state.modo === "foco" || (!!state.modo && !!state.modelo)
  const canGerar = canContinueStep1 && !!state.movimento

  const BottomBar = () => (
    <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        <span className="text-foreground font-medium">{CREDITOS_POR_VIDEO} créditos</span> por vídeo
      </p>
      {step < 2 ? (
        <Button variant="gradient" size="lg"
          disabled={(step === 0 && !canContinueStep0) || (step === 1 && !canContinueStep1)}
          onClick={() => setStep((s) => s + 1)}>
          Continuar
        </Button>
      ) : (
        <Button variant="gradient" size="lg" disabled={!canGerar || loading} onClick={handleGerar}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
            : <><Video className="h-4 w-4 mr-2" /> Gerar vídeo · {CREDITOS_POR_VIDEO} créditos</>}
        </Button>
      )}
    </div>
  )

  // STEP 0 — Upload do produto
  if (step === 0) return (
    <div className="pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerar Vídeo com IA</h1>
        <p className="text-muted-foreground text-sm mt-1">Foto do produto + estilo + movimento = vídeo profissional</p>
      </div>
      <div className="space-y-3">
        <h2 className="font-semibold">Foto do produto</h2>
        {state.preview ? (
          <div className="relative max-w-xs">
            <img src={state.preview} alt="preview" className="w-full aspect-square object-contain rounded-2xl border border-border bg-muted" />
            <button onClick={() => { set("imagem", null); set("preview", null) }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={cn("w-full max-w-lg aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Arraste a foto aqui</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · máx 10MB</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}
      </div>
      <BottomBar />
    </div>
  )

  // STEP 1 — Escolher modo + modelo
  if (step === 1) {
    const modelosFiltrados = state.modo && state.modo !== "foco"
      ? MODELOS_INSPIRACAO.filter((m) => m.genero === state.modo)
      : []

    return (
      <div className="pb-20 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep(0)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Tipo de vídeo</h1>
            <p className="text-sm text-muted-foreground">Escolha como seu produto vai aparecer</p>
          </div>
        </div>

        {/* Botões de modo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => selecionarModo("feminino")}
            className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center",
              state.modo === "feminino" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
              state.modo === "feminino" ? "bg-primary/10" : "bg-muted")}>
              <User className={cn("h-6 w-6", state.modo === "feminino" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("font-semibold text-sm", state.modo === "feminino" ? "text-primary" : "")}>Gerar com Mulher</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modelo feminina usa seu produto</p>
            </div>
          </button>

          <button onClick={() => selecionarModo("masculino")}
            className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center",
              state.modo === "masculino" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
              state.modo === "masculino" ? "bg-primary/10" : "bg-muted")}>
              <Users className={cn("h-6 w-6", state.modo === "masculino" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("font-semibold text-sm", state.modo === "masculino" ? "text-primary" : "")}>Gerar com Homem</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modelo masculino usa seu produto</p>
            </div>
          </button>

          <button onClick={() => selecionarModo("foco")}
            className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center",
              state.modo === "foco" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
              state.modo === "foco" ? "bg-primary/10" : "bg-muted")}>
              <Package className={cn("h-6 w-6", state.modo === "foco" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("font-semibold text-sm", state.modo === "foco" ? "text-primary" : "")}>Foco no Produto</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sem personagem, só o produto</p>
            </div>
          </button>
        </div>

        {/* Grid de personagens — só aparece se escolheu feminino ou masculino */}
        {modelosFiltrados.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Escolha o personagem
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
              {modelosFiltrados.map((m) => (
                <button key={m.id} onClick={() => set("modelo", m)}
                  className={cn("relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all",
                    state.modelo?.id === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
                  <div className="relative w-full aspect-[3/4] rounded-xl bg-muted overflow-hidden">
                    <img src={m.foto} alt={m.label}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <User className="h-8 w-8 text-muted-foreground absolute inset-0 m-auto pointer-events-none" />
                    {state.modelo?.id === m.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={cn("text-xs font-medium", state.modelo?.id === m.id ? "text-primary" : "text-muted-foreground")}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <BottomBar />
      </div>
    )
  }

  // STEP 2 — Movimento + configurações
  return (
    <div className="pb-24 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Escolha o movimento</h1>
          <p className="text-sm text-muted-foreground">
            {state.modo === "foco" ? "Como o produto vai se mover" : "Como a modelo vai se mover no vídeo"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MOVIMENTOS_VIDEO.map((mv) => (
          <button key={mv.id} onClick={() => set("movimento", mv)}
            className={cn("flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all",
              state.movimento?.id === mv.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <span className={cn("font-semibold text-sm", state.movimento?.id === mv.id ? "text-primary" : "")}>{mv.label}</span>
            <span className="text-xs text-muted-foreground leading-snug">{mv.desc}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Formato</h2>
        <div className="flex flex-wrap gap-3">
          {FORMATOS.map(({ id, label, desc }) => (
            <button key={id} onClick={() => set("aspecto", id)}
              className={cn("flex flex-col p-3 rounded-xl border-2 text-left min-w-[140px] transition-all",
                state.aspecto === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
              <span className={cn("font-semibold text-sm", state.aspecto === id ? "text-primary" : "")}>{label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {state.movimento && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
          <p className="text-sm font-medium">Resumo</p>
          <p className="text-xs text-muted-foreground">
            Tipo: <span className="text-foreground">{state.modo === "foco" ? "Foco no Produto" : state.modo === "feminino" ? "Modelo Feminina" : "Modelo Masculino"}</span>
            {state.modelo && <> · Personagem: <span className="text-foreground">{state.modelo.label}</span></>}
            {" "}· Movimento: <span className="text-foreground">{state.movimento.label}</span>
            {" "}· Formato: <span className="text-foreground">{state.aspecto}</span>
          </p>
        </div>
      )}

      <BottomBar />
    </div>
  )
}
