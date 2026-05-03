import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { removeBackground } from "@imgly/background-removal-node"
import sharp from "sharp"
import { CREDITOS_TABELA, type Qualidade, type QuantidadeImagens } from "@/lib/types"

// Dimensões por formato (largura × altura)
const FORMAT_DIMS: Record<string, [number, number]> = {
  "1:1":  [1024, 1024],
  "9:16": [576,  1024],
  "4:5":  [820,  1024],
  "3:4":  [768,  1024],
  "16:9": [1024, 576],
  "4:3":  [1024, 768],
}

// Inference steps por qualidade (afeta riqueza do fundo gerado por IA)
const QUALITY_STEPS: Record<string, number> = {
  "1K": 4,
  "2K": 8,
  "4K": 12,
}

const CENARIO_PROMPTS: Record<string, string> = {
  marmore:     "white Carrara marble surface, luxury minimal setup",
  natureza:    "fresh flowers, green leaves, natural botanical setting, earth tones",
  premium:     "dark premium studio, black velvet surface, high-end luxury",
  minimalista: "clean white minimal background, soft subtle shadow",
  colorido:    "vibrant colorful abstract backdrop, bold contrasting colors",
  urbano:      "urban concrete texture, street style, modern city aesthetic",
}

const ILUMINACAO_PROMPTS: Record<string, string> = {
  estudio_neutro: "neutral diffused studio lighting, even exposure",
  natural_suave:  "soft natural daylight, gentle window light",
  dramatica:      "dramatic side lighting, strong contrast, deep shadows",
  golden_hour:    "warm golden hour sunlight, cinematic glow",
}

const ANGULO_PROMPTS: Record<string, string> = {
  flat_lay:    "flat lay overhead top-down view",
  frontal:     "straight-on frontal angle",
  "45_graus":  "45 degree diagonal angle",
  perspectiva: "dynamic low-angle perspective",
}

const HF_ROUTER = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"

function buildPrompt(params: {
  cenario?: string
  iluminacao?: string
  angulo?: string
  observacoes?: string
  variacao: number
}): string {
  const parts = [
    "professional product photography",
    CENARIO_PROMPTS[params.cenario ?? "minimalista"],
    ILUMINACAO_PROMPTS[params.iluminacao ?? "estudio_neutro"],
    ANGULO_PROMPTS[params.angulo ?? "frontal"],
    "high resolution, sharp focus, commercial photography",
    `variation ${params.variacao}`,
  ]
  if (params.observacoes) parts.push(params.observacoes)
  return parts.filter(Boolean).join(", ")
}

async function gerarFundoFlux(
  prompt: string,
  hfToken: string,
  width: number,
  height: number,
  steps: number,
): Promise<Buffer | null> {
  const res = await fetch(HF_ROUTER, {
    method: "POST",
    headers: { "Authorization": `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { num_inference_steps: steps, guidance_scale: 0, width, height },
    }),
  })
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

async function gerarFundoBranco(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .jpeg()
    .toBuffer()
}

async function compositar(produtoSemFundo: Buffer, fundo: Buffer): Promise<Buffer> {
  const fundoImg = sharp(fundo)
  const { width = 1024, height = 1024 } = await fundoImg.metadata()

  const produtoResized = await sharp(produtoSemFundo)
    .resize(Math.round(width * 0.75), Math.round(height * 0.75), { fit: "inside" })
    .toBuffer()

  const { width: pw = 512, height: ph = 512 } = await sharp(produtoResized).metadata()
  const left = Math.round((width - pw) / 2)
  const top = Math.round((height - ph) * 0.45)

  return sharp(fundo)
    .composite([{ input: produtoResized, left, top, blend: "over" }])
    .jpeg({ quality: 92 })
    .toBuffer()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const formData = await req.formData()
  const imagem      = formData.get("imagem") as File | null
  const estilo      = formData.get("estilo") as string
  const tipoProduto = formData.get("tipoProduto") as string
  const formato     = (formData.get("formato") as string) || "1:1"
  const qualidade   = (formData.get("qualidade") as Qualidade) || "1K"
  const quantidade  = Number(formData.get("quantidade") ?? "3") as QuantidadeImagens
  const cenario     = (formData.get("cenario") as string) || "minimalista"
  const iluminacao  = (formData.get("iluminacao") as string) || "estudio_neutro"
  const angulo      = (formData.get("angulo") as string) || "frontal"
  const observacoes = (formData.get("observacoes") as string) || ""

  if (!imagem) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 })
  if (!["fundo_branco", "ambientada", "com_modelo"].includes(estilo))
    return NextResponse.json({ error: "Estilo inválido" }, { status: 400 })
  if (!["1K", "2K", "4K"].includes(qualidade))
    return NextResponse.json({ error: "Qualidade inválida" }, { status: 400 })
  if (![3, 5, 9].includes(quantidade))
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
  if (!(formato in FORMAT_DIMS))
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 })

  const creditosNecessarios = CREDITOS_TABELA[qualidade][quantidade]

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  if (!profile || profile.credits < creditosNecessarios) {
    return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 })
  }

  // Upload da imagem original
  const buffer = Buffer.from(await imagem.arrayBuffer())
  const ext = imagem.name.split(".").pop() ?? "jpg"
  const originalPath = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from("produtos")
    .upload(originalPath, buffer, { contentType: imagem.type, upsert: false })

  if (uploadError)
    return NextResponse.json({ error: "Erro no upload: " + uploadError.message }, { status: 500 })

  const { data: { publicUrl: imagemOriginalUrl } } = adminClient.storage.from("produtos").getPublicUrl(originalPath)

  const estiloLabel = estilo === "ambientada"
    ? `Ambientada · ${cenario} · ${iluminacao} · ${qualidade}`
    : `Fundo Branco · ${qualidade}`

  const { data: geracao, error: geracaoError } = await adminClient
    .from("geracoes")
    .insert({
      user_id: user.id,
      imagem_original_url: imagemOriginalUrl,
      imagens_geradas: [],
      estilo: estiloLabel,
      quantidade,
      creditos_usados: creditosNecessarios,
      status: "processando",
    })
    .select()
    .single()

  if (geracaoError || !geracao)
    return NextResponse.json({ error: "Erro ao criar geração" }, { status: 500 })

  await adminClient.from("profiles")
    .update({ credits: profile.credits - creditosNecessarios })
    .eq("id", user.id)

  try {
    // Remoção de fundo local via WASM (sem API externa)
    const blob = new Blob([buffer], { type: imagem.type })
    const semFundoBlob = await removeBackground(blob)
    const semFundoBuffer = Buffer.from(await semFundoBlob.arrayBuffer())

    const [fmtW, fmtH] = FORMAT_DIMS[formato] ?? [1024, 1024]
    const steps = QUALITY_STEPS[qualidade] ?? 4

    const imagensGeradas: string[] = []

    for (let i = 0; i < quantidade; i++) {
      let fundoBuffer: Buffer

      if (estilo === "fundo_branco") {
        fundoBuffer = await gerarFundoBranco(fmtW, fmtH)
      } else {
        const prompt = buildPrompt({ cenario, iluminacao, angulo, observacoes, variacao: i + 1 })
        const flux = await gerarFundoFlux(prompt, process.env.HF_TOKEN!, fmtW, fmtH, steps)
        fundoBuffer = flux ?? await gerarFundoBranco(fmtW, fmtH)
      }

      const final = await compositar(semFundoBuffer, fundoBuffer)
      const geradaPath = `${user.id}/gerada_${geracao.id}_${i}.jpg`

      const { error: saveErr } = await adminClient.storage
        .from("produtos")
        .upload(geradaPath, final, { contentType: "image/jpeg", upsert: true })

      if (!saveErr) {
        const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(geradaPath)
        imagensGeradas.push(publicUrl)
      }
    }

    await adminClient.from("geracoes")
      .update({ imagens_geradas: imagensGeradas, status: "concluido" })
      .eq("id", geracao.id)

    return NextResponse.json({ ok: true, geracaoId: geracao.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na geração"
    await adminClient.from("geracoes").update({ status: "erro", erro: msg }).eq("id", geracao.id)
    // Estorna créditos em caso de erro
    await adminClient.from("profiles").update({ credits: profile.credits }).eq("id", user.id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
