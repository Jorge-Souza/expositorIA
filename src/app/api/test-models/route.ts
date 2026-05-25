import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ""
const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Acesso negado" }, { status: 403 })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}&pageSize=100`,
  )
  const data = await res.json()

  const modelos = (data.models ?? []).map((m: { name: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
    name: m.name,
    displayName: m.displayName,
    methods: m.supportedGenerationMethods,
  }))

  return Response.json({ status: res.status, total: modelos.length, modelos, raw_error: data.error ?? null })
}
