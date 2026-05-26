import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

const MOVIMENTO_PROMPTS: Record<string, string> = {
  catwalk:   "Person walking forward confidently, smooth natural stride, bright studio lighting, clean background",
  orbit:     "Camera slowly rotating around a person, smooth circular movement, studio lighting",
  glam:      "Person holding a pose with slow elegant movement, soft dramatic lighting, clean studio background",
  dolly:     "Camera smoothly pushing in toward the subject, slow cinematic zoom, bright even lighting",
  paparazzi: "Person turning toward camera with dynamic natural movement, bright editorial lighting",
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

  const prompt = `Fashion e-commerce product photo for social media.
Style: ${params.modeloDescricao}
The product shown in the uploaded image is being worn or held by the model.
- Keep the product EXACTLY as it appears — same colors, shape, details
- Natural, confident pose suitable for e-commerce
- Clean, professional studio or lifestyle background
- ${params.aspecto} aspect ratio
- Commercial product photography style`

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
  const imgResp = await fetch(params.imageUrl)
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer())
  const imageBase64 = imgBuffer.toString("base64")
  const mimeType = imgResp.headers.get("content-type") ?? "image/jpeg"

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{
          prompt: params.prompt,
          image: { bytesBase64Encoded: imageBase64, mimeType },
        }],
        parameters: {
          aspectRatio: params.aspectRatio,
          sampleCount: 1,
          durationSeconds: params.durationSeconds,
        },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Veo error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const opName = data.name
  if (!opName) throw new Error("Veo não retornou operation name: " + JSON.stringify(data))
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

    const videoPrompt = MOVIMENTO_PROMPTS[movimentoId] ?? movimentoLabel ?? "Person holding product with smooth natural movement, bright studio lighting"
    const fullPrompt = modo === "foco"
      ? `${videoPrompt}, product display, clean background, e-commerce style`
      : `${videoPrompt}, product display, clean studio background, e-commerce`

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
