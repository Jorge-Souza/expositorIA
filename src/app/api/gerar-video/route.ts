import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CREDITOS_POR_VIDEO = 10

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const formData = await req.formData()
  const imagem         = formData.get("imagem") as File | null
  const modo           = (formData.get("modo") as string) || "foco"
  const modeloDescricao = (formData.get("modeloDescricao") as string) || ""
  const modeloLabel    = (formData.get("modeloLabel") as string) || ""
  const motionId       = (formData.get("motionId") as string) || ""
  const movimentoLabel = (formData.get("movimentoLabel") as string) || ""
  const aspecto        = (formData.get("aspecto") as string) || "9:16"
  const duracao        = Number(formData.get("duracao") ?? "5")

  if (!imagem) return Response.json({ error: "Imagem obrigatória" }, { status: 400 })
  if (!motionId) return Response.json({ error: "Movimento obrigatório" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", user.id).single()
  if (!profile || profile.credits < CREDITOS_POR_VIDEO) {
    return Response.json({ error: "Créditos insuficientes" }, { status: 402 })
  }

  const buffer = Buffer.from(await imagem.arrayBuffer())
  const ext = imagem.name.split(".").pop() ?? "jpg"

  const originalPath = `${user.id}/video_origem_${Date.now()}.${ext}`
  await adminClient.storage.from("produtos").upload(originalPath, buffer, { contentType: imagem.type, upsert: false })
  const { data: { publicUrl: imagemOriginalUrl } } = adminClient.storage.from("produtos").getPublicUrl(originalPath)

  const tipoLabel = modo === "foco" ? "Foco no Produto" : modo === "feminino" ? "Modelo Feminina" : "Modelo Masculino"
  const estiloLabel = modeloLabel
    ? `${tipoLabel} · ${modeloLabel} · ${movimentoLabel} · ${aspecto}`
    : `${tipoLabel} · ${movimentoLabel} · ${aspecto}`

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

  await adminClient.from("profiles").update({ credits: profile.credits - CREDITOS_POR_VIDEO }).eq("id", user.id)

  // Salva os parâmetros no registro para a rota /processar usar
  await adminClient.from("geracoes").update({
    erro: JSON.stringify({ modo, modeloDescricao, motionId, movimentoLabel, aspecto, duracao }),
  }).eq("id", geracao.id)

  return Response.json({ videoId: geracao.id, imagemOriginalUrl })
}
