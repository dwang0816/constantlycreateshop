// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const EXIF: any

export function extractDPI(file: File): Promise<number | null> {
  return new Promise(resolve => {
    // Method 1: EXIF tags (JPEG)
    if (typeof EXIF !== 'undefined') {
      EXIF.getData(file, function (this: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xRes = EXIF.getTag(this as any, 'XResolution')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unit = EXIF.getTag(this as any, 'ResolutionUnit')
        if (xRes) {
          const dpi = unit === 3 ? Math.round(xRes * 2.54) : xRes
          return resolve(dpi)
        }
        readFromBuffer(file, resolve)
      })
    } else {
      readFromBuffer(file, resolve)
    }
  })
}

function readFromBuffer(file: File, resolve: (dpi: number | null) => void) {
  const reader = new FileReader()
  reader.onload = e => {
    const buf = e.target?.result as ArrayBuffer
    if (!buf) return resolve(null)
    const view = new DataView(buf)

    // PNG: pHYs chunk
    if (file.type === 'image/png') {
      let offset = 8
      while (offset < buf.byteLength - 12) {
        const len = view.getUint32(offset)
        const type = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        )
        if (type === 'pHYs') {
          const ppmX = view.getUint32(offset + 8)
          const unit = view.getUint8(offset + 16)
          if (unit === 1) return resolve(Math.round(ppmX / 39.3701))
        }
        offset += 12 + len
      }
    }

    // JPEG: JFIF APP0
    if (file.type !== 'image/png') {
      for (let i = 0; i < Math.min(buf.byteLength - 10, 200); i++) {
        if (
          view.getUint8(i) === 0x4a &&
          view.getUint8(i + 1) === 0x46 &&
          view.getUint8(i + 2) === 0x49 &&
          view.getUint8(i + 3) === 0x46
        ) {
          const unit = view.getUint8(i + 7)
          const xDens = view.getUint16(i + 8)
          if (unit === 1 && xDens > 0) return resolve(xDens)
          if (unit === 2 && xDens > 0) return resolve(Math.round(xDens * 2.54))
        }
      }
    }

    resolve(null)
  }
  reader.readAsArrayBuffer(file.slice(0, 60000))
}
