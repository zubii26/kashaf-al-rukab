'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type ExtractedData = {
  full_name: string | null
  nationality: string | null
  passport_number: string | null
  visa_number: string | null
  expiry_date: string | null
  document_image_url: string | null
}

// Resize image to max 1024px on long edge before sending to API (cost control)
const MAX_SIZE = 1024

async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width <= MAX_SIZE && height <= MAX_SIZE) {
        resolve(file)
        return
      }

      if (width > height) {
        height = Math.round((height * MAX_SIZE) / width)
        width = MAX_SIZE
      } else {
        width = Math.round((width * MAX_SIZE) / height)
        height = MAX_SIZE
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name || 'image.jpg', { type: 'image/jpeg' }) : file),
        'image/jpeg', 0.85
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

interface Props {
  onBatchScanSuccess: (data: ExtractedData) => void
}

export function DocumentScannerUpload({ onBatchScanSuccess }: Props) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processingRef = useRef(false)
  const queueRef = useRef<File[]>([])
  const onSuccessRef = useRef(onBatchScanSuccess)
  useEffect(() => { onSuccessRef.current = onBatchScanSuccess }, [onBatchScanSuccess])

  // ─── Core: drain the file queue one-by-one ───────────────────────────────
  const drainQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const total = queueRef.current.length
    setProgress({ current: 0, total })
    setStatus('processing')
    setErrorMsg(null)

    let successCount = 0

    while (queueRef.current.length > 0) {
      const file = queueRef.current.shift()!
      const current = total - queueRef.current.length
      setProgress({ current, total })

      try {
        const resized = await resizeImage(file)
        const fd = new FormData()
        fd.append('file', resized)

        const res = await fetch('/api/scan-document', { method: 'POST', body: fd })
        const json = await res.json()

        if (!res.ok) {
          setErrorMsg(json.error || `Scan failed (${res.status})`)
          continue
        }

        onSuccessRef.current(json as ExtractedData)
        successCount++
      } catch (err: any) {
        setErrorMsg(`Network error: ${err?.message ?? 'unknown'}`)
      }
    }

    processingRef.current = false
    setStatus(successCount > 0 ? 'done' : 'error')
    if (successCount > 0) setTimeout(() => setStatus('idle'), 4000)
  }, [])

  const enqueue = useCallback((files: File[]) => {
    if (files.length === 0) return
    queueRef.current = [...queueRef.current, ...files]
    drainQueue()
  }, [drainQueue])

  // ─── Click to browse (creates temp input OUTSIDE the form) ───────────────
  const openFileBrowser = useCallback(() => {
    if (processingRef.current) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    input.style.display = 'none'

    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : []
      document.body.removeChild(input)
      if (files.length > 0) enqueue(files)
    }

    // Handle cancel (focus returns to window without change)
    const onFocus = () => {
      setTimeout(() => {
        if (document.body.contains(input)) document.body.removeChild(input)
        window.removeEventListener('focus', onFocus)
      }, 500)
    }
    window.addEventListener('focus', onFocus)

    document.body.appendChild(input)
    input.click()
  }, [enqueue])

  // ─── Paste (Ctrl+V) ──────────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItems = items.filter(i => i.type.startsWith('image/'))
      if (imageItems.length === 0) return
      e.preventDefault()
      const files = imageItems.map(i => i.getAsFile()).filter((f): f is File => f !== null)
      if (files.length > 0) enqueue(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enqueue])

  // ─── Drag and drop ───────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    let files = Array.from(e.dataTransfer.files)
    if (files.length === 0) {
      files = Array.from(e.dataTransfer.items)
        .filter(i => i.kind === 'file')
        .map(i => i.getAsFile())
        .filter((f): f is File => f !== null)
    }
    if (files.length > 0) enqueue(files)
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  const isProcessing = status === 'processing'

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full border-2 border-dashed rounded-lg transition-colors ${
        isDragging
          ? 'border-accent bg-accent/5'
          : isProcessing
            ? 'border-border bg-surface'
            : status === 'done'
              ? 'border-success bg-surface'
              : 'border-border bg-surface hover:border-accent'
      }`}
    >
      <div className="p-8 text-center space-y-4">
        {isProcessing ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary">
              Reading document {progress.current} of {progress.total}…
            </p>
            <p className="text-xs text-text-secondary">AI is extracting passenger details</p>
          </div>
        ) : status === 'done' ? (
          <p className="text-sm font-semibold text-success">
            ✓ Scanned {progress.total} {progress.total === 1 ? 'document' : 'documents'} — review fields below
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Batch Auto-Fill</p>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Click the button below, drag &amp; drop, or press{' '}
              <kbd className="px-1 py-0.5 bg-border rounded text-text-primary font-mono text-xs">Ctrl+V</kbd>
              {' '}to paste a copied image.
            </p>
            <button
              type="button"
              onClick={openFileBrowser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Select Document Image
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-2 flex items-start justify-between gap-2 p-3 bg-surface border border-danger rounded text-left">
            <p className="text-xs text-danger">{errorMsg}</p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setErrorMsg(null); setStatus('idle') }}
              className="text-xs text-text-secondary hover:text-text-primary flex-shrink-0 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
