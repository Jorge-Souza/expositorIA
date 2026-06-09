import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { email, password, nome } = await request.json()

  if (!email || !password || !nome) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { nome },
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
