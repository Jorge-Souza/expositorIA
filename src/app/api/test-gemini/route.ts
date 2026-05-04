import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""

export const maxDuration = 60

export async function GET(_req: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return Response.json({ ok: false, erro: "GOOGLE_API_KEY não configurada no Vercel" })
  }

  try {
    const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })

    // pixel branco 1x1 PNG
    const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/png", data: pixel } },
            { text: "Transform this into a product photo on a clean white background. Output only the image." },
          ],
        },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    let temImagem = false
    let tamanho = 0
    for (const part of parts) {
      if (part.inlineData?.data) {
        temImagem = true
        tamanho = part.inlineData.data.length
      }
    }

    return Response.json({ ok: true, temImagem, tamanho, partes: parts.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, erro: msg }, { status: 500 })
  }
}
