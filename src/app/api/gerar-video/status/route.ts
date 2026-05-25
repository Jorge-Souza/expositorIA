import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
    // Polling da operação Veo via HTTP
    const opRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geracao.higgsfield_job_id}?key=${GOOGLE_API_KEY}`
    )

    if (!opRes.ok) {
      const text = await opRes.text()
      return Response.json({ status: "processando", videoUrl: null, veoStatus: `${opRes.status}: ${text}` })
    }

    const operation = await opRes.json()

    if (!operation.done) {
      return Response.json({ status: "processando", videoUrl: null, veoStatus: "running" })
    }

    if (operation.error) {
      const erro = operation.error.message ?? "Erro no Veo"
      await adminClient.from("geracoes").update({ status: "erro", erro }).eq("id", videoId)
      return Response.json({ status: "erro", erro })
    }

    // Extrai URI do vídeo gerado
    const generatedVideos = operation.response?.generatedVideos ?? []
    const videoUri: string = generatedVideos[0]?.video?.uri ?? generatedVideos[0]?.uri ?? ""

    if (!videoUri) {
      const erro = "Veo concluiu mas não retornou vídeo: " + JSON.stringify(operation.response)
      await adminClient.from("geracoes").update({ status: "erro", erro }).eq("id", videoId)
      return Response.json({ status: "erro", erro })
    }

    // Tenta baixar e armazenar no Supabase
    let videoUrl = videoUri
    try {
      const videoResp = await fetch(videoUri)
      if (videoResp.ok) {
        const videoBuffer = Buffer.from(await videoResp.arrayBuffer())
        const videoPath = `${geracao.user_id}/video_final_${videoId}.mp4`
        await adminClient.storage.from("produtos").upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true })
        const { data: { publicUrl } } = adminClient.storage.from("produtos").getPublicUrl(videoPath)
        videoUrl = publicUrl
      }
    } catch { /* usa videoUri direto se download falhar */ }

    await adminClient.from("geracoes").update({ status: "concluido", video_url: videoUrl }).eq("id", videoId)
    return Response.json({ status: "concluido", videoUrl })
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err)
    return Response.json({ status: "processando", videoUrl: null, veoStatus: erro })
  }
}
