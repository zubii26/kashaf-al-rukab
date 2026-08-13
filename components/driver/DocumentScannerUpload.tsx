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

// ─── Image resize (cost control) ─────────────────────────────────────────────
// Caps the long edge at 1024px and re-encodes as JPEG@85% before any upload.
// This is the single biggest lever on vision API cost — enforced on every path.
const MAX_PX = 1024

async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      // Already small enough — skip re-encoding to preserve quality
      if (width <= MAX_PX && height <= MAX_PX) { resolve(file); return }

      if (width > height) { height = Math.round((height * MAX_PX) / width); width = MAX_PX }
      else { width = Math.round((width * MAX_PX) / height); height = MAX_PX }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob
          ? new File([blob], file.name || 'document.jpg', { type: 'image/jpeg' })
          : file),
        'image/jpeg', 0.85
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ─── Network retry helper ─────────────────────────────────────────────────────
// Retries up to MAX_RETRIES times with exponential backoff (1s → 2s → 4s).
// The resized File is kept in memory so a retry never forces a re-photo.
const MAX_RETRIES = 3

async function scanWithRetry(
  resizedFile: File,
  onRetryAttempt: (attempt: number, maxRetries: number) => void,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  let lastErr: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onRetryAttempt(attempt, MAX_RETRIES)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
    }

    try {
      const fd = new FormData()
      fd.append('file', resizedFile)

      const res = await fetch('/api/scan-document', { method: 'POST', body: fd })
      const data = await res.json()
      return { ok: res.ok, status: res.status, data }
    } catch (err) {
      lastErr = err
      // Network error (no response) — will retry
    }
  }

  // All retries exhausted — surface the last network error
  const msg = lastErr instanceof Error ? lastErr.message : 'Network error'
  return { ok: false, status: 0, data: { error: msg } }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onBatchScanSuccess: (data: ExtractedData) => void
}

type Status = 'idle' | 'processing' | 'retrying' | 'done' | 'error'

export function DocumentScannerUpload({ onBatchScanSuccess }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [retryInfo, setRetryInfo] = useState({ attempt: 0, max: MAX_RETRIES })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processingRef = useRef(false)
  const queueRef = useRef<File[]>([])
  const pendingFileRef = useRef<File | null>(null) // kept for manual retry
  const onSuccessRef = useRef(onBatchScanSuccess)
  useEffect(() => { onSuccessRef.current = onBatchScanSuccess }, [onBatchScanSuccess])

  // ─── Core queue processor ────────────────────────────────────────────────
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

      // Resize client-side before sending (cost control)
      const resized = await resizeImage(file)

      // Keep the resized file in case the user manually retries
      pendingFileRef.current = resized

      const { ok, data } = await scanWithRetry(
        resized,
        (attempt, max) => {
          setStatus('retrying')
          setRetryInfo({ attempt, max })
        },
      )

      setStatus('processing') // restore after retry loop

      const json = data as Record<string, unknown>

      if (!ok) {
        const errText = (json?.error as string) || 'Scan failed. Tap retry or try another image.'
        setErrorMsg(errText)
        continue
      }

      onSuccessRef.current(json as ExtractedData)
      pendingFileRef.current = null
      successCount++
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

  // ─── Manual retry (uses the already-resized file from the failed attempt) ──
  const handleManualRetry = useCallback(() => {
    const file = pendingFileRef.current
    if (!file) return
    queueRef.current = [file, ...queueRef.current]
    processingRef.current = false
    setErrorMsg(null)
    drainQueue()
  }, [drainQueue])

  // ─── File picker (temp input appended to body, outside any <form>) ────────
  const openFileBrowser = useCallback(() => {
    if (processingRef.current) return
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    input.capture = '' // removed: causes issues on Android; camera shows as option anyway
    input.style.display = 'none'

    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : []
      document.body.removeChild(input)
      if (files.length > 0) enqueue(files)
    }

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

  // ─── Ctrl+V paste ────────────────────────────────────────────────────────
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
  const isProcessing = status === 'processing' || status === 'retrying'

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
              ? 'border-green-500 bg-surface'
              : 'border-border bg-surface hover:border-accent'
      }`}
    >
      <div className="p-6 text-center space-y-3">

        {status === 'processing' && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary">
              Reading document {progress.current} of {progress.total}…
            </p>
            <p className="text-xs text-text-secondary">AI is extracting passenger details</p>
          </div>
        )}

        {status === 'retrying' && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary">
              Connection lost — retrying ({retryInfo.attempt}/{retryInfo.max})…
            </p>
            <p className="text-xs text-text-secondary">
              Your photo is saved. No need to retake.
            </p>
          </div>
        )}

        {status === 'done' && (
          <p className="text-sm font-semibold text-green-600">
            ✓ Scanned {progress.total} {progress.total === 1 ? 'document' : 'documents'} — review fields below
          </p>
        )}

        {(status === 'idle' || status === 'error') && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Batch Auto-Fill</p>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Click the button, drag &amp; drop, or press{' '}
              <kbd className="px-1 py-0.5 bg-border rounded text-text-primary font-mono text-xs">Ctrl+V</kbd>
              {' '}to paste. The AI extracts passport/visa fields automatically.
            </p>
            <button
              type="button"
              onClick={openFileBrowser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Select Document Image
            </button>
          </div>
        )}

        {/* Error message + action buttons */}
        {errorMsg && (
          <div className="mt-2 flex flex-col gap-2 p-3 bg-surface border border-red-300 rounded text-left">
            <p className="text-xs text-red-600">{errorMsg}</p>
            <div className="flex items-center gap-2">
              {/* Retry button — reuses the already-resized image, no re-photo needed */}
              {pendingFileRef.current && (
                <button
                  type="button"
                  onClick={handleManualRetry}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => { setErrorMsg(null); setStatus('idle') }}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
