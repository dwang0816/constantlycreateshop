import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { generateOrderNumber } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

interface AdditionalItem {
  index: number
  variantId: string
  variantTitle: string
  quantity: number
  price: number
  printWidth: number
  printHeight: number
  dpi: number
  resizedImageBlobUrl?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const variantTitle = formData.get('variantTitle') as string
    const price = parseFloat(formData.get('price') as string)
    const quantity = parseInt(formData.get('quantity') as string)
    const printWidth = parseFloat(formData.get('printWidth') as string)
    const printHeight = parseFloat(formData.get('printHeight') as string)
    const dpi = formData.get('dpi') as string
    const additionalItemsRaw = formData.get('additionalItems') as string

    let parsedAdditional: AdditionalItem[] = []
    try {
      parsedAdditional = JSON.parse(additionalItemsRaw || '[]')
    } catch {}

    void quantity // price already includes quantity multiplier

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Primary item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `DTF Gang Sheet — ${variantTitle}`,
          description: `${printWidth.toFixed(2)}" × ${printHeight.toFixed(2)}" @ ${dpi} DPI`,
        },
        unit_amount: Math.round(price * 100),
      },
      quantity: 1,
    })

    // Additional items
    for (const item of parsedAdditional) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `DTF Gang Sheet — ${item.variantTitle}`,
            description: `${parseFloat(String(item.printWidth)).toFixed(2)}" × ${parseFloat(String(item.printHeight)).toFixed(2)}"`,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      })
    }

    // Flat shipping
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping & Handling' },
        unit_amount: 1000,
      },
      quantity: 1,
    })

    const orderNumber = await generateOrderNumber()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link'],
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      phone_number_collection: { enabled: true },
      customer_creation: 'always',
      invoice_creation: { enabled: true },
      success_url: `${process.env.SUCCESS_URL || baseUrl + '/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.CANCEL_URL || baseUrl + '/dtf',
      metadata: {
        orderNumber,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('/api/stripe-checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
