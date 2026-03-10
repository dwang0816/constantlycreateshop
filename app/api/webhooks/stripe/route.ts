import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import sgMail from '@sendgrid/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  })
}

function initSendGrid() {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  }
}

const processedSessions = new Set<string>()

const VENDOR_EMAIL = 'dwang0816@gmail.com'

interface Attachment {
  content: string
  filename: string
  type: string
  disposition: 'attachment'
}

async function fetchImageAsBase64(
  url: string,
  filename: string
): Promise<Attachment | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    return {
      content: buffer.toString('base64'),
      filename,
      type: 'image/png',
      disposition: 'attachment',
    }
  } catch {
    return null
  }
}

async function sendVendorEmail(
  session: Stripe.Checkout.Session,
  orderNumber: string
) {
  if (!process.env.SENDGRID_API_KEY) return

  const customer = session.customer_details
  const total = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`
  const imageCount = parseInt(session.metadata?.imageCount ?? '0')

  // Fetch all images from Vercel Blob
  const attachmentResults = await Promise.all(
    Array.from({ length: imageCount }, async (_, i) => {
      const url = session.metadata?.[`imageUrl_${i}`]
      if (!url) return null
      return fetchImageAsBase64(url, `design-${i + 1}.png`)
    })
  )
  const attachments = attachmentResults.filter((a): a is Attachment => a !== null)

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">New DTF Order — ${orderNumber}</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr>
          <td style="padding:8px 0; color:#666; width:140px;">Order Number</td>
          <td style="padding:8px 0; font-weight:600;">${orderNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Customer Name</td>
          <td style="padding:8px 0;">${customer?.name ?? 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Customer Email</td>
          <td style="padding:8px 0;">${customer?.email ?? 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Phone</td>
          <td style="padding:8px 0;">${customer?.phone ?? 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Total Charged</td>
          <td style="padding:8px 0; font-weight:600;">${total}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Design Files</td>
          <td style="padding:8px 0;">${attachments.length} file${attachments.length !== 1 ? 's' : ''} attached</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Stripe Session</td>
          <td style="padding:8px 0; font-size:12px; color:#888;">${session.id}</td>
        </tr>
      </table>
      ${
        customer?.address
          ? `
      <h3 style="margin-top:24px; color:#1a1a1a;">Shipping Address</h3>
      <p style="margin:0; line-height:1.6;">
        ${customer.name ?? ''}<br/>
        ${customer.address.line1 ?? ''}${customer.address.line2 ? '<br/>' + customer.address.line2 : ''}<br/>
        ${customer.address.city ?? ''}, ${customer.address.state ?? ''} ${customer.address.postal_code ?? ''}<br/>
        ${customer.address.country ?? ''}
      </p>`
          : ''
      }
    </div>
  `

  try {
    await sgMail.send({
      to: VENDOR_EMAIL,
      from: VENDOR_EMAIL,
      subject: `New DTF Order — ${orderNumber} (${total})`,
      html,
      text: `New DTF Order ${orderNumber}\nCustomer: ${customer?.name} <${customer?.email}>\nTotal: ${total}\nStripe: ${session.id}`,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  } catch (err) {
    console.error('Vendor email error:', err)
  }
}

async function sendCustomerEmail(
  session: Stripe.Checkout.Session,
  orderNumber: string
) {
  if (!process.env.SENDGRID_API_KEY) return
  const customerEmail = session.customer_details?.email
  if (!customerEmail) return

  const total = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">Thanks for your order!</h2>
      <p style="color: #555;">We've received your DTF gang sheet order and will begin printing within 1–2 business days.</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr>
          <td style="padding:8px 0; color:#666; width:140px;">Order Number</td>
          <td style="padding:8px 0; font-weight:600;">${orderNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">Total Charged</td>
          <td style="padding:8px 0; font-weight:600;">${total}</td>
        </tr>
      </table>
      <p style="margin-top:24px; color:#555;">
        We'll send another email when your prints ship. Reply to this email with any questions.
      </p>
      <p style="color:#555;">— Constantly Create Shop</p>
    </div>
  `

  try {
    await sgMail.send({
      to: customerEmail,
      from: VENDOR_EMAIL,
      subject: `Order Confirmed — ${orderNumber}`,
      html,
      text: `Thanks for your order! Order: ${orderNumber}. Total: ${total}. We'll be in touch soon.`,
    })
  } catch (err) {
    console.error('Customer email error:', err)
  }
}

export async function POST(req: NextRequest) {
  initSendGrid()
  const body = await req.arrayBuffer()
  const rawBody = Buffer.from(body)
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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
