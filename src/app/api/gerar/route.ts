import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"
import { CREDITOS_TABELA, type Qualidade, type QuantidadeImagens } from "@/lib/types"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

const CENARIO_PROMPTS: Record<string, string> = {
  marmore:     "white Carrara marble surface, luxury minimal setup",
  natureza:    "fresh flowers, green leaves, natural botanical setting",
  premium:     "dark premium studio, black velvet, high-end luxury",
  minimalista: "clean white minimal background, soft subtle shadow",
  colorido:    "vibrant colorful abstract backdrop, bold contrasting colors",
  urbano:      "urban concrete texture, street style, modern city",
}

const ILUMINACAO_PROMPTS: Record<string, string> = {
  estudio_neutro: "neutral diffused studio lighting",
  natural_suave:  "soft natural daylight, gentle window light",
  dramatica:      "dramatic side lighting, deep shadows",
  golden_hour:    "warm golden hour sunlight, cinematic glow",
}

const ANGULO_PROMPTS: Record<string, string> = {
  flat_lay:    "flat lay top-down overhead view",
  frontal:     "straight-on frontal view",
  "45_graus":  "45-degree diagonal angle",
  perspectiva: "dynamic low-angle perspective",
}

const FORMAT_RATIOS: Record<string, string> = {
  "1:1":  "square 1:1 aspect ratio",
  "9:16": "vertical 9:16 for TikTok/Stories",
  "4:5":  "vertical 4:5 for Instagram feed",
  "3:4":  "vertical 3:4 portrait",
  "16:9": "horizontal 16:9 widescreen",
  "4:3":  "horizontal 4:3 classic",
}

function buildPrompt(params: {
  estilo: string
  cenario: string
  iluminacao: string
  angulo: string
  formato: string
  observacoes: string
  variacao: number
  total: number
}): string {
  const angulo = ANGULO_PROMPTS[params.angulo] ?? "frontal view"
  const formato = FORMAT_RATIOS[params.formato] ?? "square format"

  if (params.estilo === "fundo_branco") {
    return `Professional e-commerce product photography. Take this product and create a clean, high-quality white background product photo.
- Pure white background, no gradients
- Professional even studio lighting, soft shadows
- ${angulo}
- ${formato}
- Product sharp, centered, and clearly visible
- Ready for TikTok Shop and e-commerce listing
${params.observacoes ? `Extra: ${params.observacoes}` : ""}
Variation ${params.variacao} of ${params.total}.`
  }

  if (params.estilo === "com_modelo") {
    return `Professional fashion e-commerce photo. Show this product being worn or used by a model.
- Place the product on a realistic human model appropriate for the product type
- ${ILUMINACAO_PROMPTS[params.iluminacao] ?? "studio lighting"}
- ${angulo}
- ${formato}
- The model should look natural and aspirational, like a real brand campaign
- High-quality photorealistic commercial photograph
- Ready for TikTok Shop and Instagram
${params.observacoes ? `Extra instructions: ${params.observacoes}` : ""}
Variation ${params.variacao} of ${params.total} — make this one unique.`
  }

  return `Professional e-commerce product photography. Take this product and create a stunning lifestyle scene photo for social commerce.

Scene background: ${CENARIO_PROMPTS[params.cenario] ?? "minimal clean background"}
Lighting: ${ILUMINACAO_PROMPTS[params.iluminacao] ?? "studio lighting"}
Camera angle: ${angulo}
Format: ${formato}

Rules:
- Keep the product EXACTLY as it appears — do not alter the product itself
- Remove the original background, place the product naturally in the described scene
- The product must be the main focus and clearly in focus
- High-quality photorealistic commercial photograph
- Ready for TikTok Shop
${params.observacoes ? `Extra instructions: ${params.observacoes}` : ""}
Variation ${params.variacao} of ${params.total} — make this one unique.`
}

async function generateWithGemini(params: {
  imageBuffer: Buffer
  mimeType: string
  prompt: string
  modelo: string
}): Promise<Buffer | null> {
  const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })
  const imageBase64 = params.imageBuffer.toString("base64")

  try {
    const response = await genai.models.generateContent({
      model: params.modelo,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: params.mimeType, data: imageBase64 } },
            { text: params.prompt },
          ],
        },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64")
      }
    }
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(msg)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    })
  }

  const formData = await req.formData()
  const imagem      = formData.get("imagem") as File | null
  const estilo      = formData.get("estilo") as string

  const formato     = (formData.get("formato") as string) || "1:1"
  const qualidade   = (formData.get("qualidade") as Qualidade) || "1K"
  const quantidade  = Number(formData.get("quantidade") ?? "3") as QuantidadeImagens
  const cenario     = (formData.get("cenario") as string) || "minimalista"
  const iluminacao  = (formData.get("iluminacao") as string) || "estudio_neutro"
  const angulo      = (formData.get("angulo") as string) || "frontal"
  const observacoes = (formData.get("observacoes") as string) || ""
  const modelo      = (formData.get("modelo") as string) || "gemini-2.5-flash-image"

  if (!imagem) {
    return new Response(JSON.stringify({ error: "Imagem obrigatória" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    })
  }
  if (![1, 3, 5].includes(quantidade)) {
    return new Response(JSON.stringify({ error: "Quantidade inválida" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    })
  }

  const creditosNecessarios = CREDITOS_TABELA[qualidade][quantidade]
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  if (!profile || profile.credits < creditosNecessarios) {
    return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
      status: 402, headers: { "Content-Type": "application/json" },
    })
  }

  const buffer = Buffer.from(await imagem.arrayBuffer())
  const ext = imagem.name.split(".").pop() ?? "jpg"
  const originalPath = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from("produtos")
    .upload(originalPath, buffer, { contentType: imagem.type, upsert: false })

  if (uploadError) {
    return new Response(JSON.stringify({ error: "Erro no upload: " + uploadError.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    })
  }

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

  if (geracaoError || !geracao) {
    return new Response(JSON.stringify({ error: "Erro ao criar geração" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    })
  }

  await adminClient.from("profiles")
    .update({ credits: profile.credits - creditosNecessarios })
    .eq("id", user.id)

  // SSE streaming — imagens aparecem conforme geradas
  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  const send = async (data: object) => {
    try { await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
  }

  ;(async () => {
    const imagensGeradas: string[] = []

    await send({ type: "inicio", geracaoId: geracao.id, total: quantidade })

    for (let i = 0; i < quantidade; i++) {
      const prompt = buildPrompt({ estilo, cenario, iluminacao, angulo, formato, observacoes, variacao: i + 1, total: quantidade })
      try {
        const imgBuffer = await generateWithGemini({ imageBuffer: buffer, mimeType: imagem.type, prompt, modelo })

        if (imgBuffer) {
          const geradaPath = `${user.id}/gerada_${geracao.id}_${i}.jpg`
          const { error: saveErr } = await adminClient.storage
            .from("produtos")
            .upload(geradaPath, imgBuffer, { contentType: "image/jpeg", upsert: true })

          if (!saveErr) {
            const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(geradaPath)
            imagensGeradas.push(publicUrl)
            await send({ type: "imagem", url: publicUrl, index: i, total: quantidade })
          } else {
            await send({ type: "erro_imagem", index: i, mensagem: saveErr.message })
          }
        } else {
          await send({ type: "erro_imagem", index: i, mensagem: "Imagem não retornada pela API" })
        }
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : String(err)
        await send({ type: "erro_imagem", index: i, mensagem })
      }
    }

    const finalStatus = imagensGeradas.length > 0 ? "concluido" : "erro"
    await adminClient.from("geracoes")
      .update({ imagens_geradas: imagensGeradas, status: finalStatus })
      .eq("id", geracao.id)

    if (imagensGeradas.length === 0) {
      await adminClient.from("profiles").update({ credits: profile.credits }).eq("id", user.id)
    }

    await send({ type: "concluido", geracaoId: geracao.id, total: imagensGeradas.length })
    try { await writer.close() } catch {}
  })()

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
