"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft, ImageIcon, X, Loader2, Video,
  Zap, Sparkles, Play, Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CREDITOS_VIDEO, MOVIMENTOS_VIDEO, FORMATOS_VIDEO,
  type ModeloVideo, type AspectRatioVideo, type DuracaoVideo,
} from "@/lib/types"

interface VideoState {
  imagem: File | null
  preview: string | null
  movimento: string
  movimentoPrompt: string
  descricao: string
  modelo: ModeloVideo
  aspecto: AspectRatioVideo
  duracao: DuracaoVideo
}

const INITIAL: VideoState = {
  imagem: null,
  preview: null,
  movimento: "flutuar",
  movimentoPrompt: MOVIMENTOS_VIDEO[0].prompt,
  descricao: "",
  modelo: "dop-lite",
  aspecto: "9:16",
  duracao: 5,
}

const MODELOS_VIDEO: { id: ModeloVideo; label: string; desc: string; badge?: string }[] = [
  { id: "dop-lite",    label: "Rápido",   desc: "Geração mais veloz, boa qualidade", badge: "Recomendado" },
  { id: "dop-preview", label: "Premium",  desc: "Máxima qualidade cinematográfica" },
]

const DURACOES: DuracaoVideo[] = [5, 10]

export default function GerarVideoPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [state, setState] = useState<VideoState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Estado do vídeo gerado
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState<"processando" | "concluido" | "erro" | null>(null)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
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

  function escolherMovimento(id: string) {
    const mov = MOVIMENTOS_VIDEO.find((m) => m.id === id)
    if (!mov) return
    set("movimento", id)
    set("movimentoPrompt", mov.prompt)
  }

  const creditos = CREDITOS_VIDEO[state.modelo][state.duracao]

  // Polling do status do vídeo
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
          toast.error(data.erro ?? "Erro ao gerar vídeo")
        }
      } catch {
        // continua tentando
      }
    }, 4000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [videoId, pollingStatus])

  async function handleGerar() {
    if (!state.imagem) return
    setLoading(true)
    setVideoId(null)
    setVideoUrl(null)
    setPollingStatus(null)
    setErroMsg(null)

    const promptFinal = state.descricao
      ? `${state.movimentoPrompt}. ${state.descricao}`
      : state.movimentoPrompt

    const form = new FormData()
    form.append("imagem", state.imagem)
    form.append("prompt", promptFinal)
    form.append("modelo", state.modelo)
    form.append("aspecto", state.aspecto)
    form.append("duracao", String(state.duracao))

    try {
      const res = await fetch("/api/gerar-video", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao iniciar geração")
        setLoading(false)
        return
      }

      setVideoId(data.videoId)
      setPollingStatus("processando")
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  // Tela de geração em andamento / resultado
  if (loading || pollingStatus) return (
    <div className="space-y-8 pb-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          {pollingStatus === "concluido" ? "Vídeo pronto!" : pollingStatus === "erro" ? "Erro na geração" : "Gerando seu vídeo..."}
        </h1>
        <p className="text-muted-foreground text-sm">
          {pollingStatus === "concluido"
            ? "Seu vídeo foi gerado com sucesso"
            : pollingStatus === "erro"
            ? erroMsg
            : "Isso pode levar 1 a 3 minutos. Aguarde..."}
        </p>
      </div>

      {/* Loading */}
      {pollingStatus === "processando" && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border">
            {state.preview && <img src={state.preview} alt="produto" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
          <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full animate-pulse w-1/2" />
          </div>
          <p className="text-xs text-muted-foreground">O Higgsfield está animando seu produto...</p>
        </div>
      )}

      {/* Vídeo concluído */}
      {pollingStatus === "concluido" && videoUrl && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-[9/16] max-w-xs mx-auto">
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-3 justify-center">
            <a href={videoUrl} download="expositorIA_video.mp4" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar vídeo
              </Button>
            </a>
            <Button
              variant="gradient"
              onClick={() => { setLoading(false); setPollingStatus(null); setVideoId(null); setVideoUrl(null); setState(INITIAL); setStep(0) }}
            >
              Gerar outro
            </Button>
          </div>
        </div>
      )}

      {/* Erro */}
      {pollingStatus === "erro" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">Erro da API:</p>
            <p className="text-xs text-destructive/80 font-mono break-all mt-1">{erroMsg}</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => { setLoading(false); setPollingStatus(null); setVideoId(null); setErroMsg(null) }}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  // Barra inferior fixa
  const BottomBar = () => (
    <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Rápido 5s: <span className="text-foreground font-medium">{CREDITOS_VIDEO["dop-lite"][5]} créditos</span></span>
        <span>Premium 5s: <span className="text-foreground font-medium">{CREDITOS_VIDEO["dop-preview"][5]} créditos</span></span>
      </div>
      {step < 1 ? (
        <Button
          variant="gradient" size="lg"
          disabled={!state.imagem}
          onClick={() => setStep(1)}
        >
          Continuar
        </Button>
      ) : (
        <Button
          variant="gradient" size="lg"
          disabled={loading || !state.imagem}
          onClick={handleGerar}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : <><Video className="h-4 w-4" /> Gerar vídeo · {creditos} créditos</>
          }
        </Button>
      )}
    </div>
  )

  // ---------- STEP 0 — upload + movimento ----------
  if (step === 0) return (
    <div className="pb-20 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Gerar Vídeo com IA</h1>
        <p className="text-muted-foreground text-sm">Transforme a foto do seu produto em um vídeo animado para TikTok Shop</p>
      </div>

      {/* Upload */}
      <div className="space-y-3">
        <h2 className="font-semibold">Foto do produto</h2>
        {state.preview ? (
          <div className="relative max-w-xs">
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
              <p className="font-medium">Arraste a foto aqui</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · máx 10MB</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}
      </div>

      {/* Tipo de movimento */}
      <div className="space-y-3">
        <h2 className="font-semibold">Tipo de movimento</h2>
        <p className="text-sm text-muted-foreground">Escolha como o produto vai se mover no vídeo</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MOVIMENTOS_VIDEO.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => escolherMovimento(id)}
              className={cn(
                "flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all",
                state.movimento === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className={cn("font-semibold text-sm", state.movimento === id ? "text-primary" : "")}>{label}</span>
              <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <BottomBar />
    </div>
  )

  // ---------- STEP 1 — configurar ----------
  return (
    <div className="pb-24 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(0)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Configure o vídeo</h1>
          <p className="text-sm text-muted-foreground">Formato, duração e qualidade</p>
        </div>
      </div>

      {/* Formato */}
      <div className="space-y-3">
        <h2 className="font-semibold">Formato do vídeo</h2>
        <div className="flex flex-wrap gap-3">
          {FORMATOS_VIDEO.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => set("aspecto", id)}
              className={cn(
                "flex flex-col p-3 rounded-xl border-2 text-left min-w-[140px] transition-all",
                state.aspecto === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className={cn("font-semibold text-sm", state.aspecto === id ? "text-primary" : "")}>{label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duração */}
      <div className="space-y-3">
        <h2 className="font-semibold">Duração</h2>
        <div className="flex gap-3">
          {DURACOES.map((d) => (
            <button
              key={d}
              onClick={() => set("duracao", d)}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border-2 min-w-[100px] transition-all",
                state.duracao === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className={cn("text-2xl font-bold", state.duracao === d ? "text-primary" : "")}>{d}s</span>
              <span className="text-xs text-muted-foreground mt-1">
                {CREDITOS_VIDEO[state.modelo][d]} créditos
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Qualidade */}
      <div className="space-y-3">
        <h2 className="font-semibold">Qualidade</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODELOS_VIDEO.map(({ id, label, desc, badge }) => (
            <button
              key={id}
              onClick={() => set("modelo", id)}
              className={cn(
                "relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all",
                state.modelo === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              {badge && (
                <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                  {badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                {id === "dop-lite" ? <Zap className={cn("h-4 w-4", state.modelo === id ? "text-primary" : "text-muted-foreground")} /> : <Sparkles className={cn("h-4 w-4", state.modelo === id ? "text-primary" : "text-muted-foreground")} />}
                <span className={cn("font-semibold text-sm", state.modelo === id ? "text-primary" : "")}>{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{desc}</span>
              <span className="text-xs font-medium text-muted-foreground mt-1">
                {CREDITOS_VIDEO[id][state.duracao]} créditos · {state.duracao}s
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Descrição extra */}
      <div className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          Descrição extra
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </h2>
        <p className="text-sm text-muted-foreground">Detalhes adicionais sobre o movimento ou estilo desejado</p>
        <div className="relative">
          <textarea
            value={state.descricao}
            onChange={(e) => set("descricao", e.target.value.slice(0, 300))}
            placeholder="Ex: fundo branco · movimento bem suave · iluminação dourada"
            rows={3}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{state.descricao.length}/300</span>
        </div>
      </div>

      {/* Preview do movimento escolhido */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Play className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {MOVIMENTOS_VIDEO.find((m) => m.id === state.movimento)?.label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {MOVIMENTOS_VIDEO.find((m) => m.id === state.movimento)?.desc}
          </p>
        </div>
      </div>

      <BottomBar />
    </div>
  )
}
