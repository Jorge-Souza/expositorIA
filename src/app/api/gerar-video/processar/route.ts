import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

const MOVIMENTO_PROMPTS: Record<string, string> = {
  catwalk:   "Fashion model walking confidently on a runway, elegant catwalk stride, professional fashion show",
  orbit:     "Camera slowly orbiting 360 degrees around the fashion model, smooth circular camera movement",
  glam:      "Glamorous fashion editorial movement, slow dramatic pose, high-fashion magazine style",
  dolly:     "Smooth cinematic zoom toward the product, elegant slow push-in camera movement",
  paparazzi: "Fashion celebrity moment, dynamic movement with dramatic lighting, editorial energy",
}

async function gerarImagemComGemini(params: {
  imagemOriginalUrl: string
  modeloDescricao: string
  aspecto: string
}): Promise<Buffer> {
  const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })

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
- High-quality photorealistic commercial photograph`

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: prompt },
    ]}],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64")
  }
  throw new Error("Gemini não retornou imagem")
}

async function submitVeoJob(params: {
  imageUrl: string
  prompt: string
  aspectRatio: string
  durationSeconds: number
}): Promise<string> {
  const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })

  const imgResp = await fetch(params.imageUrl)
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer())
  const imageBase64 = imgBuffer.toString("base64")
  const mimeType = imgResp.headers.get("content-type") ?? "image/jpeg"

  const operation = await (genai.models as any).generateVideo({
    model: "veo-2.0-generate-001",
    prompt: params.prompt,
    image: { imageBytes: imageBase64, mimeType },
    config: {
      aspectRatio: params.aspectRatio,
      numberOfVideos: 1,
      durationSeconds: params.durationSeconds,
    },
  })

  const opName = operation?.name ?? operation?.operationName
  if (!opName) throw new Error("Veo não retornou operation name: " + JSON.stringify(operation))
  return opName
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const { videoId, imagemOriginalUrl } = await req.json()
  if (!videoId) return Response.json({ error: "videoId obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: geracao } = await adminClient
    .from("geracoes").select("*").eq("id", videoId).eq("user_id", user.id).single()

  if (!geracao) return Response.json({ error: "Não encontrado" }, { status: 404 })

  let params: { modo: string; modeloDescricao: string; motionId: string; movimentoLabel: string; movimentoId: string; aspecto: string; duracao: number }
  try { params = JSON.parse(geracao.erro ?? "{}") } catch {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }

  const { modo, modeloDescricao, movimentoLabel, movimentoId, aspecto, duracao } = params
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

    const videoPrompt = MOVIMENTO_PROMPTS[movimentoId] ?? movimentoLabel ?? "Elegant fashion movement, professional e-commerce video"
    const fullPrompt = modo === "foco"
      ? `${videoPrompt}, product showcase, professional e-commerce, TikTok Shop style`
      : `${videoPrompt}, TikTok Shop Brazil, professional fashion e-commerce`

    const operationName = await submitVeoJob({
      imageUrl: imageUrlParaVideo,
      prompt: fullPrompt,
      aspectRatio: aspecto,
      durationSeconds: duracao,
    })

    await adminClient.from("geracoes").update({ higgsfield_job_id: operationName, erro: null }).eq("id", videoId)
    return Response.json({ ok: true, operationName })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    await adminClient.from("geracoes").update({ status: "erro", erro: mensagem }).eq("id", videoId)
    const { data: p } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
    if (p) await adminClient.from("profiles").update({ credits: p.credits + credits }).eq("id", user.id)
    return Response.json({ error: mensagem }, { status: 500 })
  }
}
