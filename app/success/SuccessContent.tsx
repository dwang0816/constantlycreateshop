'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { clearCartFilesFromIndexedDB } from '@/lib/indexeddb'

interface OrderDetails {
  customerEmail: string | null
  orderNumber: string | null
  amountTotal: number | null
  lineItems: Array<{
    description: string
    amount_total: number
    price?: { product_data?: { name?: string }; unit_amount?: number }
  }>
}

export function SuccessContent() {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id')
    if (!sessionId) {
      setError('No session ID found.')
      setLoading(false)
      return
    }

    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setOrder(data)
          // Clear cart
          localStorage.removeItem('cart_metadata')
          localStorage.removeItem('checkout_initiated')
          clearCartFilesFromIndexedDB().catch(() => {})
        }
      })
      .catch(() => setError('Failed to load order details.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center pt-20 px-4">
        <div className="w-full max-w-lg text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your order…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border bg-card p-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button asChild variant="outline">
                <Link href="/dtf">Back to Shop</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Order Confirmed!</h1>
                {order?.orderNumber && (
                  <p className="text-sm text-muted-foreground">
                    Order number:{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {order.orderNumber}
                    </span>
                  </p>
                )}
                {order?.customerEmail && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirmation sent to{' '}
                    <span className="font-medium text-foreground">{order.customerEmail}</span>
                  </p>
                )}
              </div>

              {order?.amountTotal != null && (
                <div className="rounded-xl bg-secondary/50 px-6 py-4">
                  <p className="text-sm text-muted-foreground mb-1">Total charged</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${(order.amountTotal / 100).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground text-left space-y-2 rounded-xl border border-border p-4">
                <p className="font-medium text-foreground mb-2">What happens next?</p>
                <p>• We'll review your file and begin printing within 1–2 business days.</p>
                <p>• You'll receive an email when your order ships.</p>
                <p>• Questions? Reply to your confirmation email anytime.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <Link href="/dtf">
                    Order More Prints
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
