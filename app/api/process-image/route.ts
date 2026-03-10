import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const removeWhite = formData.get('removeWhite') === 'true'
    const removeBlack = formData.get('removeBlack') === 'true'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    // Read original DPI so the trim step can preserve it
    const originalMetadata = await sharp(buffer).metadata()

    // --- White background removal ---
    if (removeWhite) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const pixels = new Uint8Array(data)
      const totalPixels = info.width * info.height

      const WHITE_END = 50      // distance 0-50: fully transparent
      const CONTENT_START = 200 // distance 200+: fully opaque content

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4
        if (pixels[idx + 3] === 0) continue

        const distance = Math.max(
          Math.abs(pixels[idx]     - 255),
          Math.abs(pixels[idx + 1] - 255),
          Math.abs(pixels[idx + 2] - 255)
        )

        if (distance <= WHITE_END) {
          pixels[idx + 3] = 0
        } else if (distance < CONTENT_START) {
          const t = (distance - WHITE_END) / (CONTENT_START - WHITE_END)
          const opacity = 0.05 + t * 0.90
          const newAlpha = Math.round(opacity * pixels[idx + 3])
          pixels[idx + 3] = Math.max(1, Math.min(255, newAlpha))
        }
        // distance >= CONTENT_START: leave alpha unchanged
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer()
    }

    // --- Black background removal ---
    if (removeBlack) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const pixels = new Uint8Array(data)
      const totalPixels = info.width * info.height

      const BLACK_END = 50      // distance 0-50: fully transparent
      const CONTENT_START = 120 // distance 120+: fully opaque content

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4
        if (pixels[idx + 3] === 0) continue

        const distance = Math.max(
          Math.abs(pixels[idx]     - 0),
          Math.abs(pixels[idx + 1] - 0),
          Math.abs(pixels[idx + 2] - 0)
        )

        if (distance <= BLACK_END) {
          pixels[idx + 3] = 0
        } else if (distance < CONTENT_START) {
          const t = (distance - BLACK_END) / (CONTENT_START - BLACK_END)
          const opacity = 0.05 + t * 0.90
          const newAlpha = Math.round(opacity * pixels[idx + 3])
          pixels[idx + 3] = Math.max(1, Math.min(255, newAlpha))
        }
        // distance >= CONTENT_START: leave alpha unchanged
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer()
    }

    // --- Photoshop-style trim: bounding box of non-transparent pixels ---
    const { data: trimData, info: trimInfo } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const trimPixels = new Uint8Array(trimData)
    const imgWidth = trimInfo.width
    const imgHeight = trimInfo.height
    const TRIM_ALPHA_THRESHOLD = 10

    let minX = imgWidth, maxX = 0, minY = imgHeight, maxY = 0

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const alpha = trimPixels[(y * imgWidth + x) * 4 + 3]
        if (alpha > TRIM_ALPHA_THRESHOLD) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    const density = originalMetadata.density || 300

    if (minX > maxX || minY > maxY) {
      // Fully transparent — return as-is with metadata preserved
      buffer = await sharp(buffer)
        .withMetadata({ density })
        .png({ compressionLevel: 9 })
        .toBuffer()
    } else {
      const cropWidth = maxX - minX + 1
      const cropHeight = maxY - minY + 1

      buffer = await sharp(buffer)
        .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
        .withMetadata({ density })
        .png({ compressionLevel: 9 })
        .toBuffer()
    }

    const base64 = buffer.toString('base64')
    const meta = await sharp(buffer).metadata()

    return NextResponse.json({
      success: true,
      imageDataUrl: `data:image/png;base64,${base64}`,
      finalDimensions: { width: meta.width, height: meta.height },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('/api/process-image error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
