'use client'

import { useRef, useState, DragEvent } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface Props {
  onFileSelected: (file: File) => void
  isUploading: boolean
  error: string | null
  onErrorDismiss: () => void
}

export function ImageUploadZone({ onFileSelected, isUploading, error, onErrorDismiss }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <button onClick={onErrorDismiss} className="mt-0.5 shrink-0 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors select-none',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/50',
          isUploading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="sr-only"
          ref={fileInputRef}
          onChange={handleChange}
        />

        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground">Processing your image…</p>
            <p className="text-xs text-muted-foreground mt-1">Trimming transparent edges</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              Drop your design here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1">PNG or JPEG</span>
              <span className="rounded-full bg-secondary px-3 py-1">300 DPI required</span>
              <span className="rounded-full bg-secondary px-3 py-1">Max 100 MB</span>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Transparent background recommended. White or black BG can be removed in cart.
      </p>
    </div>
  )
}
