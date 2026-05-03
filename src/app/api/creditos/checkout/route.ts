import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Stripe from "stripe"
import { PACKS } from "@/lib/types"

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { packId } = await req.json()
  const pack = PACKS.find((p) => p.id === packId)
  if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single()

  // Cria ou recupera customer no Stripe
  let customerId = profile?.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await adminClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id)
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `${pack.nome} — ${pack.creditos} créditos`,
            description: `Pack ${pack.nome}: ${pack.creditos} créditos expositorIA`,
          },
          unit_amount: pack.preco,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/creditos?sucesso=1`,
    cancel_url: `${origin}/creditos`,
    metadata: {
      user_id: user.id,
      pack_id: packId,
      creditos: String(pack.creditos),
    },
  })

  return NextResponse.json({ url: session.url })
}
