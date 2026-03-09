import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import sgMail from '@sendgrid/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const processedSessions = new Set<string>()

async function sendVendorEmail(session: Stripe.Checkout.Session, orderNumber: string) {
  if (!process.env.SENDGRID_API_KEY || !process.env.VENDOR_EMAIL) return
  try {
    await sgMail.send({
      to: process.env.VENDOR_EMAIL,
      from: process.env.VENDOR_EMAIL,
      subject: `New DTF Order — ${orderNumber}`,
      text: [
        `Order: ${orderNumber}`,
        `Customer: ${session.customer_details?.email}`,
        `Total: $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
        `Stripe Session: ${session.id}`,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Vendor email error:', err)
  }
}

async function sendCustomerEmail(session: Stripe.Checkout.Session, orderNumber: string) {
  if (!process.env.SENDGRID_API_KEY) return
  const customerEmail = session.customer_details?.email
  if (!customerEmail) return
  try {
    await sgMail.send({
      to: customerEmail,
      from: process.env.VENDOR_EMAIL!,
      subject: `Order Confirmed — ${orderNumber}`,
      text: [
        `Thank you for your order!`,
        `Order number: ${orderNumber}`,
        `Total: $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
        `We'll notify you when your prints are ready.`,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Customer email error:', err)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer()
  const rawBody = Buffer.from(body)
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signature error'
    console.error('Webhook signature error:', message)
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (processedSessions.has(session.id)) {
      return NextResponse.json({ received: true })
    }
    processedSessions.add(session.id)

    const orderNumber = session.metadata?.orderNumber ?? 'Unknown'

    await Promise.allSettled([
      sendVendorEmail(session, orderNumber),
      sendCustomerEmail(session, orderNumber),
    ])
  }

  return NextResponse.json({ received: true })
}
