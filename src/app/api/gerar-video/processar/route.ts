import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? ""
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai"

export const maxDuration = 60

async function gerarImagemComGemini(params: {
  imagemOriginalUrl: string
  modeloDescricao: string
  aspecto: string
}): Promise<Buffer> {
  const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })

  // Baixa a imagem do produto do Supabase
  const resp = await fetch(params.imagemOriginalUrl)
  const produtoBuffer = Buffer.from(await resp.arrayBuffer())
  const imageBase64 = produtoBuffer.toString("base64")
  const mimeType = resp.headers.get("content-type") ?? "image/jpeg"

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
    model: "gemini-2.5-flash-image",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
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

  const { videoId, imagemOriginalUrl } = await req.json()
  if (!videoId) return Response.json({ error: "videoId obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: geracao } = await adminClient
    .from("geracoes")
    .select("*")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single()

  if (!geracao) return Response.json({ error: "Não encontrado" }, { status: 404 })

  // Recupera parâmetros salvos temporariamente no campo erro
  let params: { modo: string; modeloDescricao: string; motionId: string; movimentoLabel: string; aspecto: string; duracao: number }
  try {
    params = JSON.parse(geracao.erro ?? "{}")
  } catch {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }

  const { modo, modeloDescricao, motionId, movimentoLabel, aspecto, duracao } = params
  const credits = geracao.creditos_usados

  try {
    let imageUrlParaVideo: string

    if (modo === "foco") {
      imageUrlParaVideo = imagemOriginalUrl ?? geracao.imagem_original_url
    } else {
      const imagemGeradaBuffer = await gerarImagemComGemini({
        imagemOriginalUrl: geracao.imagem_original_url,
        modeloDescricao,
        aspecto,
      })
      const geradaPath = `${user.id}/video_gemini_${geracao.id}.jpg`
      await adminClient.storage.from("produtos").upload(geradaPath, imagemGeradaBuffer, { contentType: "image/jpeg", upsert: true })
      const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(geradaPath)
      imageUrlParaVideo = publicUrl
    }

    const jobId = await submitHiggsfieldJob({ imageUrl: imageUrlParaVideo, motionId, movimentoLabel, aspectRatio: aspecto, duration: duracao })

    // Limpa o campo erro (era só temporário) e salva o jobId
    await adminClient.from("geracoes").update({ higgsfield_job_id: jobId, erro: null }).eq("id", videoId)
    return Response.json({ ok: true, jobId })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    await adminClient.from("geracoes").update({ status: "erro", erro: mensagem }).eq("id", videoId)
    // Devolve créditos
    const { data: p } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
    if (p) await adminClient.from("profiles").update({ credits: p.credits + credits }).eq("id", user.id)
    return Response.json({ error: mensagem }, { status: 500 })
  }
}
