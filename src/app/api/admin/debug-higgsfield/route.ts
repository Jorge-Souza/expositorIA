import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? ""
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai"
const ADMIN_EMAIL = "jorge.expdigital@gmail.com"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Acesso negado" }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Busca os jobs travados em processando com higgsfield_job_id
  const { data: jobs } = await adminClient
    .from("geracoes")
    .select("id, higgsfield_job_id, estilo, created_at, user_id, creditos_usados")
    .eq("status", "processando")
    .eq("tipo", "video")
    .not("higgsfield_job_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10)

  const results = await Promise.all((jobs ?? []).map(async (job) => {
    // Tenta diferentes endpoints do Higgsfield
    const attempts = [
      { method: "GET",  url: `/v1/generations/${job.higgsfield_job_id}` },
      { method: "POST", url: `/v1/generations/${job.higgsfield_job_id}` },
      { method: "GET",  url: `/v1/image2video/dop/${job.higgsfield_job_id}` },
      { method: "POST", url: `/v1/image2video/dop/${job.higgsfield_job_id}` },
      { method: "GET",  url: `/v1/status/${job.higgsfield_job_id}` },
      { method: "POST", url: `/v1/status`, body: { request_id: job.higgsfield_job_id } },
    ]

    const responses: Record<string, unknown> = {}
    for (const { method, url, body } of attempts) {
      const key = `${method} ${url}`
      try {
        const res = await fetch(`${HIGGSFIELD_BASE}${url}`, {
          method,
          headers: { "Authorization": `Key ${HIGGSFIELD_API_KEY}`, "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
        responses[key] = { status: res.status, body: await res.json().catch(() => res.text()) }
      } catch (e) {
        responses[key] = { error: String(e) }
      }
    }

    return {
      id: job.id,
      higgsfield_job_id: job.higgsfield_job_id,
      estilo: job.estilo,
      created_at: job.created_at,
      creditos_usados: job.creditos_usados,
      higgsfield_responses: responses,
    }
  }))

  return Response.json({ jobs: results })
}

// Endpoint para reembolsar créditos de jobs travados
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { geracaoId } = await req.json()
  const adminClient = createAdminClient()

  const { data: geracao } = await adminClient
    .from("geracoes")
    .select("*")
    .eq("id", geracaoId)
    .single()

  if (!geracao) return Response.json({ error: "Não encontrado" }, { status: 404 })

  // Marca como erro e devolve créditos
  await adminClient.from("geracoes").update({ status: "erro", erro: "Cancelado manualmente" }).eq("id", geracaoId)
  const { data: profile } = await adminClient.from("profiles").select("credits").eq("id", geracao.user_id).single()
  if (profile) {
    await adminClient.from("profiles").update({ credits: profile.credits + geracao.creditos_usados }).eq("id", geracao.user_id)
  }

  return Response.json({ ok: true, creditosDevolvidos: geracao.creditos_usados })
}
