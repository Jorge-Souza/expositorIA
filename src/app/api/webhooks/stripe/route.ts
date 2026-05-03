import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const creditos = Number(session.metadata?.creditos ?? 0)

    if (!userId || !creditos) {
      return NextResponse.json({ error: "Metadata inválida" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Busca créditos atuais e adiciona
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single()

    const atual = profile?.credits ?? 0
    await adminClient
      .from("profiles")
      .update({ credits: atual + creditos })
      .eq("id", userId)
  }

  return NextResponse.json({ received: true })
}
