import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleGenAI } from "@google/genai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const videoId = req.nextUrl.searchParams.get("videoId")
  if (!videoId) return Response.json({ error: "videoId obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: geracao } = await adminClient
    .from("geracoes").select("*").eq("id", videoId).eq("user_id", user.id).single()

  if (!geracao) return Response.json({ error: "Vídeo não encontrado" }, { status: 404 })

  if (geracao.status !== "processando") {
    return Response.json({ status: geracao.status, videoUrl: geracao.video_url, erro: geracao.erro })
  }

  if (!geracao.higgsfield_job_id) {
    return Response.json({ status: "processando", videoUrl: null })
  }

  try {
    const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })
    const operation = await (genai as any).operations.get({ name: geracao.higgsfield_job_id })

    if (!operation.done) {
      return Response.json({ status: "processando", videoUrl: null, veoStatus: "running" })
    }

    // Operação concluída — extrai URL do vídeo
    const generatedVideos = operation.response?.generatedVideos ?? operation.result?.generatedVideos ?? []
    const videoUri: string = generatedVideos[0]?.video?.uri ?? generatedVideos[0]?.uri ?? ""

    if (!videoUri) {
      const erro = operation.error?.message ?? "Veo não retornou vídeo"
      await adminClient.from("geracoes").update({ status: "erro", erro }).eq("id", videoId)
      return Response.json({ status: "erro", erro })
    }

    // Faz download do vídeo e armazena no Supabase
    const videoResp = await fetch(videoUri, {
      headers: GOOGLE_API_KEY ? { "Authorization": `Bearer ${GOOGLE_API_KEY}` } : {},
    })

    let videoUrl = videoUri
    if (videoResp.ok && videoResp.headers.get("content-type")?.includes("video")) {
      const videoBuffer = Buffer.from(await videoResp.arrayBuffer())
      const videoPath = `${geracao.user_id}/video_final_${videoId}.mp4`
      await adminClient.storage.from("produtos").upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true })
      const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(videoPath)
      videoUrl = publicUrl
    }

    await adminClient.from("geracoes").update({ status: "concluido", video_url: videoUrl }).eq("id", videoId)
    return Response.json({ status: "concluido", videoUrl })
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err)
    return Response.json({ status: "processando", videoUrl: null, veoStatus: "checking", erro })
  }
}
