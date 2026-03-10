'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartItem as CartItemType } from '@/lib/pricing'
import { getFileFromIndexedDB } from '@/lib/indexeddb'

interface Props {
  item: CartItemType
  onRemove: (id: string) => void
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
}

export function CartItemCard({
  item,
  onRemove,
  onQuantityChange,
  onRemoveWhiteBg,
  onRemoveBlackBg,
  onResize,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [bgProcessing, setBgProcessing] = useState<'white' | 'black' | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const [targetWidth, setTargetWidth] = useState(
    item.customData.printWidth.toFixed(3)
  )
  const [targetHeight, setTargetHeight] = useState(
    item.customData.printHeight.toFixed(3)
  )
  const [targetDpi, setTargetDpi] = useState(300)
  const aspectRatio = item.customData.printWidth / item.customData.printHeight

  const onWidthChange = (val: string) => {
    setTargetWidth(val)
    const n = parseFloat(val)
    if (!isNaN(n)) setTargetHeight((n / aspectRatio).toFixed(3))
  }

  const onHeightChange = (val: string) => {
    setTargetHeight(val)
    const n = parseFloat(val)
    if (!isNaN(n)) setTargetWidth((n * aspectRatio).toFixed(3))
  }

  const handleResize = async () => {
    const file = await getFileFromIndexedDB(item.id)
    if (!file) return
    setIsResizing(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('targetWidthInches', targetWidth)
      formData.append('targetHeightInches', targetHeight)
      formData.append('dpi', String(targetDpi))
      formData.append('format', 'png')

      const res = await fetch('/api/resize-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) await onResize(item.id, data)
    } finally {
      setIsResizing(false)
    }
  }

  const handleRemoveWhite = async () => {
    setBgProcessing('white')
    try { await onRemoveWhiteBg(item.id) }
    finally { setBgProcessing(null) }
  }

  const handleRemoveBlack = async () => {
    setBgProcessing('black')
    try { await onRemoveBlackBg(item.id) }
    finally { setBgProcessing(null) }
  }

  const sqIn = (item.customData.printWidth * item.customData.printHeight).toFixed(1)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Large image preview */}
      <div className="relative w-full h-48 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] bg-[length:16px_16px]">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt="Design preview"
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No preview
          </div>
        )}
        {/* Remove button overlaid top-right */}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shadow-sm"
          aria-label="Remove item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.variant.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.customData.printWidth.toFixed(2)}" × {item.customData.printHeight.toFixed(2)}" · {item.customData.dpi} DPI · {sqIn} sq in
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <p className="text-sm font-bold text-foreground">${item.price.toFixed(2)}</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onQuantityChange(item.id, -1)}
              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item.id, 1)}
              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Expand/collapse toolbar */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2"
            onClick={handleRemoveWhite}
            disabled={!!bgProcessing || isResizing}
          >
            {bgProcessing === 'white' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Remove White BG
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2"
            onClick={handleRemoveBlack}
            disabled={!!bgProcessing || isResizing}
          >
            {bgProcessing === 'black' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Remove Black BG
          </Button>
        </div>
        <button
          onClick={() => setExpanded(x => !x)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle resize panel"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Resize panel */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-secondary/30 space-y-3">
          <p className="text-xs font-medium text-foreground">Resize image</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Width (in)</label>
              <input
                type="number"
                step="0.001"
                min="0.1"
                max="22"
                value={targetWidth}
                onChange={e => onWidthChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Height (in)</label>
              <input
                type="number"
                step="0.001"
                min="0.1"
                max="300"
                value={targetHeight}
                onChange={e => onHeightChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">DPI</label>
              <select
                value={targetDpi}
                onChange={e => setTargetDpi(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value={150}>150</option>
                <option value={300}>300</option>
                <option value={600}>600</option>
              </select>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full text-xs h-8"
            onClick={handleResize}
            disabled={isResizing || !!bgProcessing}
          >
            {isResizing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Resizing…
              </>
            ) : (
              'Apply Resize'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
