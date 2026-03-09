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

    // White background removal
    if (removeWhite) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const pixels = new Uint8Array(data)
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
        const dist = Math.max(Math.abs(255 - r), Math.abs(255 - g), Math.abs(255 - b))
        if (dist <= 50) {
          pixels[i + 3] = 0
        } else if (dist <= 199) {
          const t = (dist - 50) / 149
          pixels[i + 3] = Math.round(t * 255 * 0.95)
        }
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer()
    }

    // Black background removal
    if (removeBlack) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const pixels = new Uint8Array(data)
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
        const dist = Math.max(r, g, b)
        if (dist <= 50) {
          pixels[i + 3] = 0
        } else if (dist <= 119) {
          const t = (dist - 50) / 69
          pixels[i + 3] = Math.round(t * 255)
        }
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer()
    }

    // Transparent-edge trim (always)
    const { data: trimData, info: trimInfo } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const px = new Uint8Array(trimData)
    const { width: w, height: h } = trimInfo
    let top = h, bottom = 0, left = w, right = 0

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = px[(y * w + x) * 4 + 3]
        if (alpha > 10) {
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
      }
    }

    if (top <= bottom && left <= right) {
      buffer = await sharp(buffer)
        .extract({
          left,
          top,
          width: right - left + 1,
          height: bottom - top + 1,
        })
        .png()
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
