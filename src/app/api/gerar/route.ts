import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fal } from "@fal-ai/client"
import { ESTILOS } from "@/lib/types"

fal.config({ credentials: process.env.FAL_KEY })

const STYLE_PROMPTS: Record<string, string> = {
  clean_white: "professional product photography on a clean white background, studio lighting, high resolution, commercial quality",
  lifestyle: "lifestyle product photography, natural environment, soft natural lighting, editorial style, high resolution",
  gradient: "product on a modern gradient background, purple to violet gradient, minimalist design, professional photography",
  tiktok_shop: "TikTok shop product image, vibrant colors, eye-catching background, social media ready, high contrast",
  premium: "luxury product photography, dark premium background, dramatic lighting, high-end commercial quality",
  natura: "product with natural organic elements, fresh flowers and plants, soft natural light, earthy tones",
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const formData = await req.formData()
  const imagem = formData.get("imagem") as File | null
  const estilo = formData.get("estilo") as string
  const quantidade = Number(formData.get("quantidade") ?? "3")

  if (!imagem) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 })
  if (![3, 5, 9].includes(quantidade)) return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
  if (!ESTILOS.find((e) => e.id === estilo)) return NextResponse.json({ error: "Estilo inválido" }, { status: 400 })

  const adminClient = createAdminClient()

  // Verifica créditos
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single()

  if (!profile || profile.credits < quantidade) {
    return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 })
  }

  // Faz upload da imagem original para o storage
  const ext = imagem.name.split(".").pop() ?? "jpg"
  const originalPath = `${user.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await imagem.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from("produtos")
    .upload(originalPath, buffer, { contentType: imagem.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 })
  }

  const { data: { publicUrl: imagemOriginalUrl } } = adminClient.storage
    .from("produtos")
    .getPublicUrl(originalPath)

  // Cria registro da geração
  const { data: geracao, error: geracaoError } = await adminClient
    .from("geracoes")
    .insert({
      user_id: user.id,
      imagem_original_url: imagemOriginalUrl,
      imagens_geradas: [],
      estilo: ESTILOS.find((e) => e.id === estilo)?.label ?? estilo,
      quantidade,
      creditos_usados: quantidade,
      status: "processando",
    })
    .select()
    .single()

  if (geracaoError || !geracao) {
    return NextResponse.json({ error: "Erro ao criar geração" }, { status: 500 })
  }

  // Debita créditos imediatamente
  await adminClient
    .from("profiles")
    .update({ credits: profile.credits - quantidade })
    .eq("id", user.id)

  // Gera imagens via fal.ai (Flux Kontext)
  const prompt = STYLE_PROMPTS[estilo] ?? STYLE_PROMPTS.clean_white
  const imagensGeradas: string[] = []

  try {
    for (let i = 0; i < quantidade; i++) {
      const result = await fal.run("fal-ai/flux/dev/image-to-image", {
        input: {
          image_url: imagemOriginalUrl,
          prompt: `${prompt}, variation ${i + 1}`,
          strength: 0.65,
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      }) as unknown as { images: Array<{ url: string }> }

      if (result.images?.[0]?.url) {
        imagensGeradas.push(result.images[0].url)
      }
    }

    // Atualiza com sucesso
    await adminClient
      .from("geracoes")
      .update({ imagens_geradas: imagensGeradas, status: "concluido" })
      .eq("id", geracao.id)

    return NextResponse.json({ ok: true, geracaoId: geracao.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na geração"
    await adminClient
      .from("geracoes")
      .update({ status: "erro", erro: msg })
      .eq("id", geracao.id)

    // Restitui créditos em caso de erro
    await adminClient
      .from("profiles")
      .update({ credits: profile.credits })
      .eq("id", user.id)

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
