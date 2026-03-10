'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GangSheetVariant, findClosestVariant } from '@/lib/variants'
import { CartItem, repriceCartItems } from '@/lib/pricing'
import {
  saveFileToIndexedDB,
  getFileFromIndexedDB,
  deleteFileFromIndexedDB,
  clearCartFilesFromIndexedDB,
} from '@/lib/indexeddb'
import { extractDPI } from '@/lib/dpi'
import { ImageUploadZone } from './ImageUploadZone'
import { ShoppingCart } from './ShoppingCart'
import { Navigation } from '@/components/navigation'

export function DTFProductPage() {
  const [variants, setVariants] = useState<GangSheetVariant[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartRestored, setCartRestored] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const checkoutInProgress = useRef(false)

  // Fetch variants on mount
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => setVariants(data.products))
      .catch(() => {})
  }, [])

  // Restore cart from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('cart_metadata')
    if (raw) {
      try {
        const metadata: CartItem[] = JSON.parse(raw)
        setCartItems(metadata)
      } catch {}
    }
    setCartRestored(true)
  }, [])

  // Persist cart metadata to localStorage whenever it changes
  useEffect(() => {
    if (!cartRestored) return
    const metadata = cartItems.map(
      ({ id, variant, price, quantity, customData, thumbnailUrl }) => ({
        id,
        variant,
        price,
        quantity,
        customData,
        thumbnailUrl,
      })
    )
    localStorage.setItem('cart_metadata', JSON.stringify(metadata))
  }, [cartItems, cartRestored])

  const addToCart = useCallback(
    async (
      file: File,
      variant: GangSheetVariant,
      imgWidth: number,
      imgHeight: number,
      dpi: number,
      printWidth: number,
      printHeight: number,
      thumbnailUrl: string,
      filename: string
    ) => {
      const id = `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`
      await saveFileToIndexedDB(file, id)

      const newItem: CartItem = {
        id,
        filename,
        variant,
        price: 0,
        quantity: 1,
        thumbnailUrl,
        customData: { dpi, imgWidth, imgHeight, printWidth, printHeight },
      }

      setCartItems(prev => {
        const updated = [...prev, newItem]
        return repriceCartItems(updated, variants)
      })
    },
    [variants]
  )

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null)
      setIsUploading(true)

      try {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg']
        if (!allowed.includes(file.type)) {
          setUploadError('Only PNG and JPEG files are accepted.')
          return
        }
        if (file.size > 100 * 1024 * 1024) {
          setUploadError('File must be under 100 MB.')
          return
        }

        const dpi = await extractDPI(file)
        if (!dpi) {
          setUploadError(
            'Could not read DPI from this file. Please re-export at 300 DPI from your design app.'
          )
          return
        }

        const formData = new FormData()
        formData.append('image', file)
        formData.append('removeWhite', 'false')
        formData.append('removeBlack', 'false')

        const res = await fetch('/api/process-image', { method: 'POST', body: formData })
        const data = await res.json()

        if (!data.success) {
          setUploadError(data.error || 'Image processing failed.')
          return
        }

        // Convert base64 back to File
        const base64 = data.imageDataUrl.split(',')[1]
        const bytes = atob(base64)
        const byteArray = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) byteArray[i] = bytes.charCodeAt(i)
        const blob = new Blob([byteArray], { type: 'image/png' })
        const processedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, '.png'),
          { type: 'image/png' }
        )

        // Measure pixel dimensions
        const img = new Image()
        img.onload = () => {
          const widthIn = img.naturalWidth / dpi
          const heightIn = img.naturalHeight / dpi
          const variant = findClosestVariant(widthIn, heightIn, variants)
          addToCart(
            processedFile,
            variant,
            img.naturalWidth,
            img.naturalHeight,
            dpi,
            widthIn,
            heightIn,
            data.imageDataUrl,
            file.name
          )
          setIsUploading(false)
        }
        img.onerror = () => {
          setUploadError('Failed to load processed image.')
          setIsUploading(false)
        }
        img.src = URL.createObjectURL(processedFile)
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed.')
        setIsUploading(false)
      }
    },
    [variants, addToCart]
  )

  const handleRemoveWhiteBackground = useCallback(
    async (cartItemId: string) => {
      const file = await getFileFromIndexedDB(cartItemId)
      if (!file) return

      const formData = new FormData()
      formData.append('image', file)
      formData.append('removeWhite', 'true')

      const res = await fetch('/api/process-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) return

      const base64 = data.imageDataUrl.split(',')[1]
      const bytes = atob(base64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'image/png' })
      const newFile = new File([blob], `nobg_${cartItemId}.png`, { type: 'image/png' })
      await saveFileToIndexedDB(newFile, cartItemId)

      setCartItems(prev => {
        const updated = prev.map(item => {
          if (item.id !== cartItemId) return item
          const newW = data.finalDimensions.width
          const newH = data.finalDimensions.height
          const dpi = item.customData.dpi
          const widthIn = newW / dpi
          const heightIn = newH / dpi
          return {
            ...item,
            thumbnailUrl: data.imageDataUrl,
            customData: {
              ...item.customData,
              imgWidth: newW,
              imgHeight: newH,
              printWidth: widthIn,
              printHeight: heightIn,
            },
          }
        })
        return repriceCartItems(updated, variants)
      })
    },
    [variants]
  )

  const handleRemoveBlackBackground = useCallback(
    async (cartItemId: string) => {
      const file = await getFileFromIndexedDB(cartItemId)
      if (!file) return

      const formData = new FormData()
      formData.append('image', file)
      formData.append('removeBlack', 'true')

      const res = await fetch('/api/process-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) return

      const base64 = data.imageDataUrl.split(',')[1]
      const bytes = atob(base64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'image/png' })
      const newFile = new File([blob], `nobg_${cartItemId}.png`, { type: 'image/png' })
      await saveFileToIndexedDB(newFile, cartItemId)

      setCartItems(prev => {
        const updated = prev.map(item => {
          if (item.id !== cartItemId) return item
          const newW = data.finalDimensions.width
          const newH = data.finalDimensions.height
          const dpi = item.customData.dpi
          const widthIn = newW / dpi
          const heightIn = newH / dpi
          return {
            ...item,
            thumbnailUrl: data.imageDataUrl,
            customData: {
              ...item.customData,
              imgWidth: newW,
              imgHeight: newH,
              printWidth: widthIn,
              printHeight: heightIn,
            },
          }
        })
        return repriceCartItems(updated, variants)
      })
    },
    [variants]
  )

  const handleCartItemResize = useCallback(
    async (
      cartItemId: string,
      data: {
        imageDataUrl: string
        finalDimensions: { width: number; height: number }
        resizedImageBlobUrl: string
        dpi: number
      }
    ) => {
      const base64 = data.imageDataUrl.split(',')[1]
      const bytes = atob(base64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'image/png' })
      const thumbFile = new File([blob], `resized_${cartItemId}.png`, { type: 'image/png' })
      await saveFileToIndexedDB(thumbFile, cartItemId)

      setCartItems(prev => {
        const updated = prev.map(item => {
          if (item.id !== cartItemId) return item
          const dpi = data.dpi || item.customData.dpi
          const newW = data.finalDimensions.width
          const newH = data.finalDimensions.height
          const widthIn = newW / dpi
          const heightIn = newH / dpi
          return {
            ...item,
            thumbnailUrl: data.imageDataUrl,
            customData: {
              ...item.customData,
              dpi,
              imgWidth: newW,
              imgHeight: newH,
              printWidth: widthIn,
              printHeight: heightIn,
              resizedImageBlobUrl: data.resizedImageBlobUrl,
            },
          }
        })
        return repriceCartItems(updated, variants)
      })
    },
    [variants]
  )

  const handleQuantityChange = useCallback(
    (cartItemId: string, delta: number) => {
      setCartItems(prev => {
        const updated = prev.map(item => {
          if (item.id !== cartItemId) return item
          const q = Math.max(1, item.quantity + delta)
          return { ...item, quantity: q }
        })
        return repriceCartItems(updated, variants)
      })
    },
    [variants]
  )

  const handleRemoveItem = useCallback(async (cartItemId: string) => {
    await deleteFileFromIndexedDB(cartItemId)
    setCartItems(prev => {
      const updated = prev.filter(item => item.id !== cartItemId)
      return repriceCartItems(updated, variants)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants])

  const handleCheckout = useCallback(async () => {
    if (checkoutInProgress.current || cartItems.length === 0) return
    checkoutInProgress.current = true

    try {
      const formData = new FormData()

      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i]
        const file = await getFileFromIndexedDB(item.id)
        if (!file) {
          alert('A file is missing. Please re-upload the affected item.')
          return
        }
        if (i === 0) {
          formData.append('image', file)
        } else {
          formData.append(`additionalFile_${i}`, file)
        }
      }

      const additionalItems = cartItems.slice(1).map((item, i) => ({
        index: i + 1,
        variantId: item.variant.id,
        variantTitle: item.variant.title,
        quantity: item.quantity,
        price: item.price,
        printWidth: item.customData.printWidth,
        printHeight: item.customData.printHeight,
        dpi: item.customData.dpi,
        resizedImageBlobUrl: item.customData.resizedImageBlobUrl || null,
      }))

      formData.append('additionalItems', JSON.stringify(additionalItems))
      formData.append('variantId', cartItems[0].variant.id)
      formData.append('variantTitle', cartItems[0].variant.title)
      formData.append('quantity', String(cartItems[0].quantity))
      formData.append('price', String(cartItems[0].price))
      formData.append('printWidth', String(cartItems[0].customData.printWidth))
      formData.append('printHeight', String(cartItems[0].customData.printHeight))
      formData.append('dpi', String(cartItems[0].customData.dpi))
      if (cartItems[0].customData.resizedImageBlobUrl) {
        formData.append('resizedImageBlobUrl', cartItems[0].customData.resizedImageBlobUrl)
      }

      const res = await fetch('/api/stripe-checkout', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.url) {
        localStorage.setItem('checkout_initiated', 'true')
        window.location.href = data.url
      } else {
        alert(data.error || 'Checkout failed. Please try again.')
      }
    } finally {
      checkoutInProgress.current = false
    }
  }, [cartItems])

  const handleClearCart = useCallback(async () => {
    await clearCartFilesFromIndexedDB()
    setCartItems([])
  }, [])

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-10 pt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              DTF Gang Sheet Printing
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Upload your designs (PNG or JPEG at 300 DPI), we trim transparent edges, calculate
              your print size, and price everything with volume discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Upload zone */}
            <div className="xl:col-span-1">
              <ImageUploadZone
                onFileSelected={handleFileUpload}
                isUploading={isUploading}
                error={uploadError}
                onErrorDismiss={() => setUploadError(null)}
              />

              {/* Pricing tiers info */}
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm text-foreground mb-3">Volume Pricing</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  {[
                    { label: '0–10 sq in', rate: '$0.35/sq in' },
                    { label: '10–20 sq in', rate: '$0.25/sq in' },
                    { label: '20–50 sq in', rate: '$0.15/sq in' },
                    { label: '50–100 sq in', rate: '$0.10/sq in' },
                    { label: '100–200 sq in', rate: '$0.08/sq in' },
                    { label: '200–400 sq in', rate: '$0.06/sq in' },
                    { label: '400–700 sq in', rate: '$0.05/sq in' },
                    { label: '700–1000 sq in', rate: '$0.04/sq in' },
                    { label: '1000–2500 sq in', rate: '$0.03/sq in' },
                    { label: '2500+ sq in', rate: '$0.02/sq in' },
                  ].map(t => (
                    <div key={t.label} className="flex justify-between gap-2 bg-secondary/50 rounded px-2 py-1">
                      <span>{t.label}</span>
                      <span className="font-medium text-foreground">{t.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="xl:col-span-1">
              <ShoppingCart
                items={cartItems}
                totalPrice={totalPrice}
                onRemoveItem={handleRemoveItem}
                onQuantityChange={handleQuantityChange}
                onRemoveWhiteBg={handleRemoveWhiteBackground}
                onRemoveBlackBg={handleRemoveBlackBackground}
                onResize={handleCartItemResize}
                onCheckout={handleCheckout}
                onClearCart={handleClearCart}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
