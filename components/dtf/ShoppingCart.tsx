'use client'

import { ShoppingBag, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartItem } from '@/lib/pricing'
import { CartItemCard } from './CartItem'
import { useState } from 'react'

interface Props {
  items: CartItem[]
  totalPrice: number
  onRemoveItem: (id: string) => void
  onQuantityChange: (id: string, delta: number) => void
  onRemoveWhiteBg: (id: string) => Promise<void>
  onRemoveBlackBg: (id: string) => Promise<void>
  onResize: (
    id: string,
    data: {
      imageDataUrl: string
      finalDimensions: { width: number; height: number }
      resizedImageBlobUrl: string
      dpi: number
    }
  ) => Promise<void>
  onCheckout: () => Promise<void>
  onClearCart: () => Promise<void>
}

export function ShoppingCart({
  items,
  totalPrice,
  onRemoveItem,
  onQuantityChange,
  onRemoveWhiteBg,
  onRemoveBlackBg,
  onResize,
  onCheckout,
  onClearCart,
}: Props) {
  const [checkingOut, setCheckingOut] = useState(false)

  const handleCheckout = async () => {
    setCheckingOut(true)
    try {
      await onCheckout()
    } finally {
      setCheckingOut(false)
    }
  }

  const totalSqIn = items.reduce(
    (sum, item) =>
      sum + item.customData.printWidth * item.customData.printHeight * item.quantity,
    0
  )

  const currentRate = items[0]?.customData.rate

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">
            Cart{items.length > 0 ? ` (${items.length})` : ''}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="p-4 space-y-4 max-h-[72vh] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Your cart is empty.</p>
            <p className="text-xs mt-1">Upload a design to get started.</p>
          </div>
        ) : (
          items.map(item => (
            <CartItemCard
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onQuantityChange={onQuantityChange}
              onRemoveWhiteBg={onRemoveWhiteBg}
              onRemoveBlackBg={onRemoveBlackBg}
              onResize={onResize}
            />
          ))
        )}
      </div>

      {/* Summary + checkout */}
      {items.length > 0 && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total area</span>
              <span>{totalSqIn.toFixed(1)} sq in</span>
            </div>
            {currentRate != null && (
              <div className="flex justify-between text-muted-foreground">
                <span>Rate</span>
                <span>${currentRate.toFixed(2)}/sq in</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Shipping</span>
              <span>$10.00 (flat rate)</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-2">
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Redirecting…
              </>
            ) : (
              `Checkout — $${(totalPrice + 10).toFixed(2)}`
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Powered by Stripe · Secure checkout
          </p>
        </div>
      )}
    </div>
  )
}
