import { NextRequest } from "next/server"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

export async function GET(_req: NextRequest) {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}&pageSize=100`
    )
    const data = await r.json()

    if (!r.ok) {
      return Response.json({ ok: false, erro: data }, { status: r.status })
    }

    // Filtra só os modelos que suportam generateContent ou têm "image" no nome
    const modelos = (data.models ?? [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
        m.name.includes("image") ||
        m.name.includes("imagen") ||
        (m.supportedGenerationMethods ?? []).includes("generateContent")
      )
      .map((m: { name: string; supportedGenerationMethods?: string[] }) => ({
        nome: m.name,
        metodos: m.supportedGenerationMethods,
      }))

    return Response.json({ ok: true, total: modelos.length, modelos })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, erro: msg }, { status: 500 })
  }
}
