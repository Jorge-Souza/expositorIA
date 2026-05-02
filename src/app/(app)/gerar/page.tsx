"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Upload, Sparkles, Loader2, X, Check, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ESTILOS } from "@/lib/types"

const QUANTIDADES = [
  { value: 3, label: "3 imagens", creditos: 3 },
  { value: 5, label: "5 imagens", creditos: 5 },
  { value: 9, label: "9 imagens", creditos: 9 },
]

export default function GerarPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [estilo, setEstilo] = useState(ESTILOS[0].id)
  const [quantidade, setQuantidade] = useState(3)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, WEBP)")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB")
      return
    }
    setArquivo(file)
    setPreview(URL.createObjectURL(file))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function handleGerar() {
    if (!arquivo) { toast.error("Selecione uma imagem do produto"); return }
    setLoading(true)

    const form = new FormData()
    form.append("imagem", arquivo)
    form.append("estilo", estilo)
    form.append("quantidade", String(quantidade))

    const res = await fetch("/api/gerar", { method: "POST", body: form })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? "Erro ao gerar imagens")
      setLoading(false)
      return
    }

    toast.success("Imagens geradas com sucesso!")
    router.push("/historico")
  }

  const estiloSelecionado = ESTILOS.find((e) => e.id === estilo)
  const creditosNecessarios = quantidade

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerar imagens</h1>
        <p className="text-muted-foreground">Faça upload do produto e escolha o estilo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto do produto</CardTitle>
            <CardDescription>PNG, JPG ou WEBP · máximo 10MB</CardDescription>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="preview"
                  className="w-full aspect-square object-contain rounded-lg border border-border bg-muted"
                />
                <button
                  onClick={() => { setArquivo(null); setPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Arraste ou clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Foto clara do produto, de preferência fundo branco</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações */}
        <div className="space-y-4">
          {/* Estilo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estilo das imagens</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {ESTILOS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEstilo(e.id)}
                  className={cn(
                    "relative flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left",
                    estilo === e.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {estilo === e.id && (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className={estilo === e.id ? "" : "ml-5"}>{e.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Quantidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quantidade de variações</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {QUANTIDADES.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuantidade(q.value)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg border transition-all",
                    quantidade === q.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-accent"
                  )}
                >
                  <span className={cn("text-lg font-bold", quantidade === q.value ? "text-primary" : "text-foreground")}>
                    {q.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{q.creditos} créditos</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Botão */}
          <Button
            onClick={handleGerar}
            variant="gradient"
            size="xl"
            className="w-full"
            disabled={loading || !arquivo}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando imagens...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar {quantidade} imagens · {creditosNecessarios} créditos
              </>
            )}
          </Button>

          {!arquivo && (
            <p className="text-xs text-muted-foreground text-center">
              Faça upload da foto do produto para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
