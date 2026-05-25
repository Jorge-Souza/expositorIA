import { NextRequest, after } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? ""
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai"
const CREDITOS_POR_VIDEO = 10

export const maxDuration = 60

async function gerarImagemComGemini(params: {
  produtoBuffer: Buffer
  produtoMime: string
  modeloDescricao: string
  aspecto: string
}): Promise<Buffer> {
  const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })
  const imageBase64 = params.produtoBuffer.toString("base64")

  const prompt = `Professional fashion e-commerce photo for TikTok Shop Brazil.
Create a photorealistic image of: ${params.modeloDescricao}
The model is wearing or using the product shown in the uploaded image.
- Keep the product EXACTLY as it appears — same colors, shape, details
- Natural, confident, aspirational pose perfect for social commerce
- Clean, professional studio or lifestyle background
- ${params.aspecto} aspect ratio composition
- High-quality photorealistic commercial photograph
- Ready for TikTok Shop Brazil`

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: params.produtoMime, data: imageBase64 } },
        { text: prompt },
      ],
    }],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }
  throw new Error("Gemini não retornou imagem")
}

async function submitHiggsfieldJob(params: {
  imageUrl: string
  motionId: string
  movimentoLabel: string
  aspectRatio: string
  duration: number
}): Promise<string> {
  const res = await fetch(`${HIGGSFIELD_BASE}/v1/image2video/dop`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      params: {
        model: "dop-lite",
        prompt: `Fashion model showcase, ${params.movimentoLabel} style movement, professional e-commerce video for TikTok Shop`,
        input_images: [{ type: "image_url", image_url: params.imageUrl }],
        motion_id: params.motionId,
        motion_strength: 0.8,
        aspect_ratio: params.aspectRatio,
        duration: params.duration,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Higgsfield error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const jobId = data.request_id ?? data.id ?? data.job_id
  if (!jobId) throw new Error("Higgsfield não retornou ID: " + JSON.stringify(data))
  return jobId
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const formData = await req.formData()
  const imagem          = formData.get("imagem") as File | null
  const modo            = (formData.get("modo") as string) || "foco"
  const modeloDescricao = (formData.get("modeloDescricao") as string) || ""
  const modeloLabel     = (formData.get("modeloLabel") as string) || ""
  const motionId        = (formData.get("motionId") as string) || ""
  const movimentoLabel  = (formData.get("movimentoLabel") as string) || ""
  const aspecto         = (formData.get("aspecto") as string) || "9:16"
  const duracao         = Number(formData.get("duracao") ?? "5")

  if (!imagem) return Response.json({ error: "Imagem obrigatória" }, { status: 400 })
  if (!motionId) return Response.json({ error: "Movimento obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  if (!profile || profile.credits < CREDITOS_POR_VIDEO) {
    return Response.json({ error: "Créditos insuficientes" }, { status: 402 })
  }

  const buffer = Buffer.from(await imagem.arrayBuffer())
  const ext = imagem.name.split(".").pop() ?? "jpg"

  // Upload da imagem original
  const originalPath = `${user.id}/video_origem_${Date.now()}.${ext}`
  await adminClient.storage.from("produtos").upload(originalPath, buffer, { contentType: imagem.type, upsert: false })
  const { data: { publicUrl: imagemOriginalUrl } } = adminClient.storage.from("produtos").getPublicUrl(originalPath)

  const tipoLabel = modo === "foco" ? "Foco no Produto" : modo === "feminino" ? "Modelo Feminina" : "Modelo Masculino"
  const estiloLabel = modeloLabel ? `${tipoLabel} · ${modeloLabel} · ${movimentoLabel} · ${aspecto}` : `${tipoLabel} · ${movimentoLabel} · ${aspecto}`

  // Cria registro na tabela geracoes
  const { data: geracao, error: geracaoError } = await adminClient
    .from("geracoes")
    .insert({
      user_id: user.id,
      imagem_original_url: imagemOriginalUrl,
      imagens_geradas: [],
      estilo: `Vídeo · ${estiloLabel}`,
      quantidade: 1,
      creditos_usados: CREDITOS_POR_VIDEO,
      status: "processando",
      tipo: "video",
    })
    .select()
    .single()

  if (geracaoError || !geracao) {
    return Response.json({ error: "Erro ao criar registro: " + (geracaoError?.message ?? "") }, { status: 500 })
  }

  // Debita créditos
  await adminClient.from("profiles").update({ credits: profile.credits - CREDITOS_POR_VIDEO }).eq("id", user.id)

  // Pipeline assíncrono — after() mantém a função viva no Vercel após a resposta
  after(async () => {
    try {
      let imageUrlParaVideo: string

      if (modo === "foco") {
        // Foco no produto: manda direto sem Gemini
        imageUrlParaVideo = imagemOriginalUrl
      } else {
        // Com modelo: Gemini gera imagem modelo + produto
        const imagemGeradaBuffer = await gerarImagemComGemini({
          produtoBuffer: buffer,
          produtoMime: imagem.type,
          modeloDescricao,
          aspecto,
        })
        const geradaPath = `${user.id}/video_gemini_${geracao.id}.jpg`
        await adminClient.storage.from("produtos").upload(geradaPath, imagemGeradaBuffer, { contentType: "image/jpeg", upsert: true })
        const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(geradaPath)
        imageUrlParaVideo = publicUrl
      }

      // Higgsfield anima a imagem
      const jobId = await submitHiggsfieldJob({
        imageUrl: imageUrlParaVideo,
        motionId,
        movimentoLabel,
        aspectRatio: aspecto,
        duration: duracao,
      })

      await adminClient.from("geracoes").update({ higgsfield_job_id: jobId }).eq("id", geracao.id)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err)
      await adminClient.from("geracoes").update({ status: "erro", erro: mensagem }).eq("id", geracao.id)
      await adminClient.from("profiles").update({ credits: profile.credits }).eq("id", user.id)
    }
  })

  return Response.json({ videoId: geracao.id })
}
