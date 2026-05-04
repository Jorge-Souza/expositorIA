import { NextRequest } from "next/server"
import { GoogleGenAI, RawReferenceImage, EditMode } from "@google/genai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyCES9K7ZVqJSU00SzaTzMukSzcS30oLBqM"

export const maxDuration = 60

export async function GET(_req: NextRequest) {
  try {
    const genai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })

    // imagem 1x1 pixel branco em base64
    const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="

    const response = await genai.models.editImage({
      model: "imagen-3.0-capability-001",
      prompt: "white background product photo",
      referenceImages: [
        Object.assign(new RawReferenceImage(), {
          referenceImage: { imageBytes: pixel },
          referenceId: 0,
        }),
      ],
      config: {
        editMode: EditMode.EDIT_MODE_PRODUCT_IMAGE,
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
      },
    })

    const imgBytes = response.generatedImages?.[0]?.image?.imageBytes
    return Response.json({
      ok: true,
      temImagem: !!imgBytes,
      tamanho: imgBytes ? imgBytes.length : 0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return Response.json({ ok: false, erro: msg, stack }, { status: 500 })
  }
}
