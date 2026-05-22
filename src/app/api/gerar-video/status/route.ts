import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? ""
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const videoId = req.nextUrl.searchParams.get("videoId")
  if (!videoId) return Response.json({ error: "videoId obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: video } = await adminClient
    .from("videos_gerados")
    .select("*")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single()

  if (!video) return Response.json({ error: "Vídeo não encontrado" }, { status: 404 })

  // Se já concluído ou com erro, retorna o estado atual
  if (video.status !== "processando") {
    return Response.json({ status: video.status, videoUrl: video.video_url, erro: video.erro })
  }

  if (!video.higgsfield_job_id) {
    return Response.json({ status: "processando", videoUrl: null })
  }

  // Consulta o Higgsfield pelo status do job
  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/v1/generations/${video.higgsfield_job_id}`, {
      headers: { "Authorization": `Key ${HIGGSFIELD_API_KEY}` },
    })

    if (!res.ok) {
      return Response.json({ status: "processando", videoUrl: null })
    }

    const data = await res.json()
    const higgsfieldStatus: string = data.status ?? "in_progress"

    if (higgsfieldStatus === "completed") {
      const videoUrl: string = data.video?.url ?? data.output?.url ?? data.url ?? ""
      await adminClient
        .from("videos_gerados")
        .update({ status: "concluido", video_url: videoUrl })
        .eq("id", videoId)
      return Response.json({ status: "concluido", videoUrl })
    }

    if (higgsfieldStatus === "failed" || higgsfieldStatus === "nsfw" || higgsfieldStatus === "cancelled") {
      const erro = data.error ?? `Job ${higgsfieldStatus}`
      await adminClient
        .from("videos_gerados")
        .update({ status: "erro", erro })
        .eq("id", videoId)
      return Response.json({ status: "erro", erro })
    }

    return Response.json({ status: "processando", videoUrl: null })
  } catch {
    return Response.json({ status: "processando", videoUrl: null })
  }
}
