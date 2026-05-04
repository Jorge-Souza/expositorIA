import { NextRequest } from "next/server"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

export async function GET(_req: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return Response.json({ ok: false, erro: "GOOGLE_API_KEY não configurada no Vercel" })
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}&pageSize=200`
    )
    const data = await r.json()

    if (!r.ok) {
      return Response.json({ ok: false, erro: data }, { status: r.status })
    }

    const todos = (data.models ?? []).map((m: { name: string; supportedGenerationMethods?: string[] }) => ({
      nome: m.name,
      metodos: m.supportedGenerationMethods ?? [],
    }))

    // modelos que provavelmente suportam geração de imagem
    const comImagem = todos.filter(
      (m: { nome: string; metodos: string[] }) =>
        m.nome.toLowerCase().includes("image") ||
        m.nome.toLowerCase().includes("imagen") ||
        m.nome.toLowerCase().includes("flash") ||
        m.nome.toLowerCase().includes("pro")
    )

    return Response.json({ ok: true, chaveOk: true, total: todos.length, comImagem, todos })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, erro: msg }, { status: 500 })
  }
}
