'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react'
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
  const [resizeOpen, setResizeOpen] = useState(false)
  const [bgProcessing, setBgProcessing] = useState<'white' | 'black' | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const [targetWidth, setTargetWidth] = useState(item.customData.printWidth.toFixed(3))
  const [targetHeight, setTargetHeight] = useState(item.customData.printHeight.toFixed(3))
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
    try { await onRemoveWhiteBg(item.id) } finally { setBgProcessing(null) }
  }
  const handleRemoveBlack = async () => {
    setBgProcessing('black')
    try { await onRemoveBlackBg(item.id) } finally { setBgProcessing(null) }
  }

  const sqIn = (item.customData.printWidth * item.customData.printHeight).toFixed(2)

  // Fit the image into a max bounding box while preserving aspect ratio.
  // Wide images get full width; tall images get full height.
  const MAX_W = 220
  const MAX_H = 260
  const MIN_H = 110  // so very wide images still show clearly
  let previewW: number, previewH: number
  if (aspectRatio > MAX_W / MAX_H) {
    // wider relative to the box → constrain by width
    previewW = MAX_W
    previewH = Math.max(Math.round(MAX_W / aspectRatio), MIN_H)
  } else {
    // taller → constrain by height
    previewH = MAX_H
    previewW = Math.round(MAX_H * aspectRatio)
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Main content */}
      <div className="flex gap-4 p-4">

        {/* Left: image preview sized to actual image proportions */}
        <div className="shrink-0 relative group" style={{ width: previewW, height: previewH }}>
          <div
            className="w-full h-full rounded-lg overflow-hidden relative border border-border/60"
            style={{
              backgroundImage:
                'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)',
              backgroundSize: '12px 12px',
            }}
          >
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt="Design preview"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No preview
              </div>
            )}
          </div>
        </div>

        {/* Right: info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Filename + delete */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground leading-snug break-all">
              {item.filename || 'design.png'}
            </p>
            <button
              onClick={() => onRemove(item.id)}
              className="shrink-0 mt-0.5 w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Print Size</p>
              <p className="text-xs text-foreground mt-0.5">
                {item.customData.printWidth.toFixed(2)}" × {item.customData.printHeight.toFixed(2)}"
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Image Size</p>
              <p className="text-xs text-foreground mt-0.5">
                {item.customData.imgWidth} × {item.customData.imgHeight} px
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">DPI</p>
              <p className="text-xs text-foreground mt-0.5">{item.customData.dpi}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Sq In</p>
              <p className="text-xs text-foreground mt-0.5">{sqIn} sq in</p>
            </div>
          </div>

          {/* Quantity + price */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quantity:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onQuantityChange(item.id, -1)}
                  className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => onQuantityChange(item.id, 1)}
                  className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="text-base font-bold text-primary">
              ${item.price.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">each</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-border px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Resize checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resizeOpen}
            onChange={e => setResizeOpen(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-xs font-medium text-foreground">🖼 Resize Image</span>
          <span className="text-xs text-destructive italic">(This will alter your original image)</span>
        </label>

        {/* BG removal buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleRemoveWhite}
            disabled={!!bgProcessing || isResizing}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {bgProcessing === 'white' && <Loader2 className="h-3 w-3 animate-spin" />}
            Remove White BG
          </button>
          <span className="text-border">·</span>
          <button
            onClick={handleRemoveBlack}
            disabled={!!bgProcessing || isResizing}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {bgProcessing === 'black' && <Loader2 className="h-3 w-3 animate-spin" />}
            Remove Black BG
          </button>
        </div>
      </div>

      {/* Resize panel */}
      {resizeOpen && (
        <div className="border-t border-border px-4 py-3 bg-secondary/30 space-y-3">
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
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Resizing…</>
            ) : (
              'Apply Resize'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
