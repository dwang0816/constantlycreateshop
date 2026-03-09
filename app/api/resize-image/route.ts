import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const targetWidthIn = parseFloat(formData.get('targetWidthInches') as string)
    const targetHeightIn = parseFloat(formData.get('targetHeightInches') as string)
    const dpi = parseInt(formData.get('dpi') as string) || 300
    const format = (formData.get('format') as string) || 'png'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided.' }, { status: 400 })
    }

    if (isNaN(targetWidthIn) || isNaN(targetHeightIn)) {
      return NextResponse.json({ success: false, error: 'Invalid dimensions.' }, { status: 400 })
    }

    if (targetWidthIn > 22 || targetHeightIn > 300) {
      return NextResponse.json(
        { success: false, error: 'Dimensions exceed maximum allowed (22" × 300").' },
        { status: 400 }
      )
    }

    const targetWidthPx = Math.round(targetWidthIn * dpi)
    const targetHeightPx = Math.round(targetHeightIn * dpi)

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    const resizedBuffer = await sharp(inputBuffer, {
      unlimited: true,
      limitInputPixels: false,
    })
      .resize({
        width: targetWidthPx,
        height: targetHeightPx,
        fit: 'inside',
        withoutEnlargement: false,
        kernel: 'lanczos3',
      })
      .withMetadata({ density: dpi })
      .png({ compressionLevel: 9, quality: 85 })
      .toBuffer()

    // Upload full-res file to Vercel Blob (used at checkout)
    const blobFilename = `dtf-resize-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.png`
    const blob = await put(blobFilename, resizedBuffer, {
      access: 'public',
      contentType: 'image/png',
    })

    // Return a 600px thumbnail as base64 (keep response small)
    const thumbBuffer = await sharp(resizedBuffer)
      .resize({ width: 600, fit: 'inside' })
      .png()
      .toBuffer()

    void format // used for future format support

    return NextResponse.json({
      success: true,
      imageDataUrl: `data:image/png;base64,${thumbBuffer.toString('base64')}`,
      finalDimensions: { width: targetWidthPx, height: targetHeightPx },
      resizedImageBlobUrl: blob.url,
      dpi,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('/api/resize-image error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
