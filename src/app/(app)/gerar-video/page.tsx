"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { ImageIcon, X, Loader2, Video, Download, User, Users, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  MODELOS_INSPIRACAO, MOVIMENTOS_VIDEO, REFERENCIAS_FOCO,
  type MovimentoVideo, type AspectRatioVideo, type DuracaoVideo,
} from "@/lib/types"

const CREDITOS_POR_VIDEO = 10

type Modo = "feminino" | "masculino" | "foco"

interface VideoState {
  imagem: File | null
  preview: string | null
  modo: Modo | null
  modeloId: string | null
  referenciaFocoId: string | null
  movimento: MovimentoVideo | null
  aspecto: AspectRatioVideo
  duracao: DuracaoVideo
}

const INITIAL: VideoState = {
  imagem: null,
  preview: null,
  modo: null,
  modeloId: null,
  referenciaFocoId: null,
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
  const [state, setState] = useState<VideoState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState<"processando" | "concluido" | "erro" | null>(null)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<"imagem" | "video" | null>(null)
  const [higgsfieldStatus, setHiggsfieldStatus] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [segundos, setSegundos] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  function selecionarModo(modo: Modo) {
    setState((s) => ({ ...s, modo, modeloId: null, referenciaFocoId: null }))
  }

  useEffect(() => {
    if (!videoId || pollingStatus !== "processando") return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/gerar-video/status?videoId=${videoId}`)
        const data = await res.json()
        if (data.status === "concluido") {
          setVideoUrl(data.videoUrl); setPollingStatus("concluido")
          setLoading(false); clearInterval(pollRef.current!)
          toast.success("Vídeo gerado com sucesso!")
        } else if (data.status === "erro") {
          setErroMsg(data.erro ?? "Erro ao gerar vídeo")
          setPollingStatus("erro"); setLoading(false); clearInterval(pollRef.current!)
        }
        if (data.etapa) setEtapa(data.etapa)
        if (data.higgsfieldStatus) setHiggsfieldStatus(data.higgsfieldStatus)
      } catch {}
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [videoId, pollingStatus])

  useEffect(() => {
    if (loading || pollingStatus === "processando") {
      setSegundos(0)
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, pollingStatus])

  function formatarTempo(s: number) {
    const m = Math.floor(s / 60)
    const seg = s % 60
    return m > 0 ? `${m}m ${seg.toString().padStart(2, "0")}s` : `${seg}s`
  }

  function resetar() {
    setLoading(false); setPollingStatus(null); setVideoId(null)
    setVideoUrl(null); setErroMsg(null); setEtapa(null)
    setSegundos(0); setHiggsfieldStatus(null); setState(INITIAL)
  }

  const modeloSelecionado = MODELOS_INSPIRACAO.find((m) => m.id === state.modeloId) ?? null
  const referenciaFocoSelecionada = REFERENCIAS_FOCO.find((r) => r.id === state.referenciaFocoId) ?? null

  const canGerar = !!state.imagem && !!state.modo && !!state.movimento &&
    (state.modo === "foco" ? !!referenciaFocoSelecionada : !!modeloSelecionado)

  async function handleGerar() {
    if (!canGerar) return
    setLoading(true); setVideoId(null); setVideoUrl(null)
    setPollingStatus(null); setErroMsg(null)
    setEtapa(state.modo !== "foco" ? "imagem" : "video")

    const form = new FormData()
    form.append("imagem", state.imagem!)
    form.append("modo", state.modo!)
    form.append("motionId", state.movimento!.motionId)
    form.append("movimentoId", state.movimento!.id)
    form.append("movimentoLabel", state.movimento!.label)
    form.append("aspecto", state.aspecto)
    form.append("duracao", String(state.duracao))
    if (modeloSelecionado) {
      form.append("modeloDescricao", modeloSelecionado.descricao)
      form.append("modeloLabel", modeloSelecionado.label)
    }
    if (referenciaFocoSelecionada) {
      form.append("referenciaFocoLabel", referenciaFocoSelecionada.label)
    }

    try {
      const res = await fetch("/api/gerar-video", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Erro ao iniciar"); setLoading(false); return }

      setVideoId(data.videoId); setPollingStatus("processando")

      const res2 = await fetch("/api/gerar-video/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: data.videoId, imagemOriginalUrl: data.imagemOriginalUrl }),
      })
      const data2 = await res2.json()
      if (!res2.ok) {
        toast.error(data2.error ?? "Erro ao processar")
        setPollingStatus("erro"); setErroMsg(data2.error ?? "Erro"); setLoading(false); return
      }
      setEtapa("video")
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
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
            : state.modo === "foco" ? "Veo está animando seu produto (2-4 min)..."
            : "Etapa 2/2 · Veo está animando o vídeo (2-4 min)..."}
        </p>
      </div>

      {pollingStatus === "processando" && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border">
            {state.preview && <img src={state.preview} alt="produto" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-3xl font-mono font-bold tabular-nums">{formatarTempo(segundos)}</p>
            <p className="text-xs text-muted-foreground mt-1">tempo decorrido</p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            {state.modo !== "foco" && (
              <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                etapa === "imagem" ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30")}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                  etapa === "imagem" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                  {etapa === "video" ? "✓" : "1"}
                </div>
                <div>
                  <p className={cn("text-sm font-medium", etapa === "imagem" ? "text-primary" : etapa === "video" ? "text-muted-foreground line-through" : "")}>
                    Gerar imagem com modelo
                  </p>
                  <p className="text-xs text-muted-foreground">Gemini · ~30–60s</p>
                </div>
                {etapa === "imagem" && <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />}
              </div>
            )}
            <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
              etapa === "video" ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                etapa === "video" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                {state.modo === "foco" ? "1" : "2"}
              </div>
              <div>
                <p className={cn("text-sm font-medium", etapa === "video" ? "text-primary" : "")}>Animar vídeo</p>
                <p className="text-xs text-muted-foreground">Veo · ~2–4 min</p>
              </div>
              {etapa === "video" && <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />}
            </div>
          </div>

          {higgsfieldStatus && (
            <p className="text-xs text-muted-foreground font-mono">
              Status: <span className="text-foreground">{higgsfieldStatus}</span>
            </p>
          )}

          {(() => {
            const total = state.modo === "foco" ? 90 : 180
            const pct = Math.min(95, Math.round((segundos / total) * 100))
            return (
              <div className="w-full max-w-sm space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso estimado</span><span>{pct}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
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

  const modelosFiltrados = state.modo && state.modo !== "foco"
    ? MODELOS_INSPIRACAO.filter((m) => m.genero === state.modo)
    : []

  return (
    <div className="pb-24 space-y-8 max-w-2xl">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Gerar Vídeo com IA</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Beta</span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Foto do produto + estilo + movimento = vídeo profissional</p>
      </div>

      {/* 1. Upload */}
      <section className="space-y-3">
        <h2 className="font-semibold">Foto do produto <span className="text-destructive">*</span></h2>
        {state.preview ? (
          <div className="relative w-48">
            <img src={state.preview} alt="preview" className="w-full aspect-square object-contain rounded-2xl border border-border bg-muted" />
            <button onClick={() => { set("imagem", null); set("preview", null) }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={cn("w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Arraste a foto do produto aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar · PNG, JPG, WEBP · máx 10MB</p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}
      </section>

      {/* 2. Modo */}
      <section className="space-y-3">
        <h2 className="font-semibold">Tipo de vídeo <span className="text-destructive">*</span></h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: "feminino" as Modo, icon: User,    label: "Modelo Feminina", desc: "Produto usado por modelo feminina" },
            { id: "masculino" as Modo, icon: Users,  label: "Modelo Masculino", desc: "Produto usado por modelo masculino" },
            { id: "foco" as Modo,     icon: Package, label: "Foco no Produto",  desc: "Sem personagem, só o produto" },
          ]).map(({ id, icon: Icon, label, desc }) => (
            <button key={id} onClick={() => selecionarModo(id)}
              className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center",
                state.modo === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center",
                state.modo === id ? "bg-primary/10" : "bg-muted")}>
                <Icon className={cn("h-6 w-6", state.modo === id ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div>
                <p className={cn("font-semibold text-sm", state.modo === id ? "text-primary" : "")}>{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3a. Referências de foco — só no modo foco */}
      {state.modo === "foco" && (
        <section className="space-y-3">
          <h2 className="font-semibold">Enquadramento <span className="text-destructive">*</span></h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {REFERENCIAS_FOCO.map((r) => (
              <button key={r.id} onClick={() => set("referenciaFocoId", r.id)}
                className={cn("relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all",
                  state.referenciaFocoId === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
                <div className="relative w-full aspect-square rounded-xl bg-muted overflow-hidden">
                  <img src={r.foto} alt={r.label} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  {state.referenciaFocoId === r.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn("text-xs font-medium", state.referenciaFocoId === r.id ? "text-primary" : "text-muted-foreground")}>{r.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3b. Modelos — feminino ou masculino */}
      {modelosFiltrados.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Escolha o personagem <span className="text-destructive">*</span></h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {modelosFiltrados.map((m) => (
              <button key={m.id} onClick={() => set("modeloId", m.id)}
                className={cn("relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all",
                  state.modeloId === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent")}>
                <div className="relative w-full aspect-[3/4] rounded-xl bg-muted overflow-hidden">
                  <img src={m.foto} alt={m.label} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  <User className="h-8 w-8 text-muted-foreground absolute inset-0 m-auto pointer-events-none" />
                  {state.modeloId === m.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn("text-xs font-medium", state.modeloId === m.id ? "text-primary" : "text-muted-foreground")}>{m.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. Movimento */}
      <section className="space-y-3">
        <h2 className="font-semibold">Movimento <span className="text-destructive">*</span></h2>
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
      </section>

      {/* 5. Formato */}
      <section className="space-y-3">
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
      </section>

      {/* Aviso sem som */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-start gap-3">
        <span className="text-yellow-400 text-lg shrink-0">🔇</span>
        <div className="text-sm text-yellow-200/80">
          <span className="font-semibold text-yellow-400">Atenção:</span> os vídeos gerados não possuem som nem narração. A duração máxima é de <span className="font-semibold text-yellow-400">{state.duracao} segundos</span>.
        </div>
      </div>

      {/* Bottom bar fixo */}
      <div className="fixed bottom-16 md:bottom-0 left-0 md:left-60 right-0 border-t border-border bg-card/95 backdrop-blur px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground shrink-0">
          <span className="text-foreground font-semibold">{CREDITOS_POR_VIDEO} cr.</span> por vídeo
        </p>
        <Button variant="gradient" size="lg" disabled={!canGerar || loading} onClick={handleGerar} className="shrink-0">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
            : <><Video className="h-4 w-4" /> Gerar vídeo</>}
        </Button>
      </div>
    </div>
  )
}
