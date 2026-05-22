import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CREDITOS_VIDEO, type ModeloVideo, type AspectRatioVideo, type DuracaoVideo } from "@/lib/types"

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? ""
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai"

export const maxDuration = 60

async function submitHiggsfieldJob(params: {
  imageUrl: string
  prompt: string
  model: ModeloVideo
  aspectRatio: AspectRatioVideo
  duration: DuracaoVideo
}): Promise<string> {
  const res = await fetch(`${HIGGSFIELD_BASE}/v1/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      image_urls: [params.imageUrl],
      aspect_ratio: params.aspectRatio,
      duration: params.duration,
      motion_strength: 0.8,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Higgsfield error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const jobId = data.request_id ?? data.id ?? data.job_id
  if (!jobId) throw new Error("Higgsfield não retornou ID do job")
  return jobId
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const formData = await req.formData()
  const imagem    = formData.get("imagem") as File | null
  const prompt    = (formData.get("prompt") as string) || ""
  const modelo    = (formData.get("modelo") as ModeloVideo) || "dop-lite"
  const aspecto   = (formData.get("aspecto") as AspectRatioVideo) || "9:16"
  const duracao   = Number(formData.get("duracao") ?? "5") as DuracaoVideo

  if (!imagem) {
    return Response.json({ error: "Imagem obrigatória" }, { status: 400 })
  }
  if (![5, 10].includes(duracao)) {
    return Response.json({ error: "Duração inválida" }, { status: 400 })
  }

  const creditosNecessarios = CREDITOS_VIDEO[modelo]?.[duracao]
  if (!creditosNecessarios) {
    return Response.json({ error: "Configuração inválida" }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  if (!profile || profile.credits < creditosNecessarios) {
    return Response.json({ error: "Créditos insuficientes" }, { status: 402 })
  }

  // Upload da imagem para Supabase (Higgsfield precisa de URL pública)
  const buffer = Buffer.from(await imagem.arrayBuffer())
  const ext = imagem.name.split(".").pop() ?? "jpg"
  const originalPath = `${user.id}/video_origem_${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from("produtos")
    .upload(originalPath, buffer, { contentType: imagem.type, upsert: false })

  if (uploadError) {
    return Response.json({ error: "Erro no upload: " + uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl: imagemUrl } } = adminClient.storage.from("produtos").getPublicUrl(originalPath)

  // Salva registro do vídeo no banco
  const { data: video, error: videoError } = await adminClient
    .from("videos_gerados")
    .insert({
      user_id: user.id,
      imagem_original_url: imagemUrl,
      prompt,
      modelo,
      aspecto,
      duracao,
      creditos_usados: creditosNecessarios,
      status: "processando",
    })
    .select()
    .single()

  if (videoError || !video) {
    return Response.json({ error: "Erro ao criar registro: " + (videoError?.message ?? "desconhecido") }, { status: 500 })
  }

  // Debita créditos
  await adminClient.from("profiles")
    .update({ credits: profile.credits - creditosNecessarios })
    .eq("id", user.id)

  // Submete job ao Higgsfield
  try {
    const jobId = await submitHiggsfieldJob({ imageUrl: imagemUrl, prompt, model: modelo, aspectRatio: aspecto, duration: duracao })
    await adminClient.from("videos_gerados").update({ higgsfield_job_id: jobId }).eq("id", video.id)
    return Response.json({ videoId: video.id, jobId })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    await adminClient.from("videos_gerados").update({ status: "erro", erro: mensagem }).eq("id", video.id)
    await adminClient.from("profiles").update({ credits: profile.credits }).eq("id", user.id)
    return Response.json({ error: mensagem }, { status: 500 })
  }
}
