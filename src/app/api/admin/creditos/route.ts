import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { userId, creditos } = await req.json()

  if (!userId || !creditos || creditos <= 0) {
    return Response.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single()

  if (!profile) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const novosCreditos = profile.credits + creditos
  await adminClient.from("profiles").update({ credits: novosCreditos }).eq("id", userId)

  return Response.json({ novosCreditos })
}
