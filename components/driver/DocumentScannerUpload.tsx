'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ExtractedPassenger, ScanResult } from '@/lib/ai/extractDocument'

// Re-export so consumer pages can import from one place
export type { ExtractedPassenger, ScanResult }

// ─── PDF detection ───────────────────────────────────────────────────────────
function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

// ─── Image resize (cost control + accuracy) ──────────────────────────────────
// Caps the long edge at 1536px and re-encodes as JPEG@85% before any upload.
const MAX_PX = 1536

async function resizeImage(file: File): Promise<File> {
  if (isPdf(file)) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

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
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : 'Network error'
  return { ok: false, status: 0, data: { error: msg } }
}

// ─── Braille spinner frames (JS-driven — CSS animations are disabled globally) ──
const SPINNER_FRAMES = ['⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾']

function useSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 120)
    return () => clearInterval(id)
  }, [active])
  return SPINNER_FRAMES[frame]
}

// ─── FileSlot — per-image progress state ─────────────────────────────────────
type SlotStatus = 'pending' | 'scanning' | 'done' | 'error'

type FileSlot = {
  id: string
  name: string
  status: SlotStatus
  passengersFound: number
  errorMsg: string | null
}

function truncateName(name: string, max = 28): string {
  if (name.length <= max) return name
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : ''
  return name.slice(0, max - ext.length - 1) + '…' + ext
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onBatchScanSuccess: (data: ScanResult) => void
}

type OverallStatus = 'idle' | 'processing' | 'done' | 'error'

export function DocumentScannerUpload({ onBatchScanSuccess }: Props) {
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('idle')
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([])
  const [lastWarnings, setLastWarnings] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const processingRef = useRef(false)
  const queueRef = useRef<File[]>([])
  const pendingFileRef = useRef<File | null>(null)
  const onSuccessRef = useRef(onBatchScanSuccess)
  useEffect(() => { onSuccessRef.current = onBatchScanSuccess }, [onBatchScanSuccess])

  // Spinner is active when any slot is scanning
  const isAnyScanning = fileSlots.some(s => s.status === 'scanning')
  const spinnerChar = useSpinner(isAnyScanning)

  // ─── Slot updater helper ─────────────────────────────────────────────────
  const updateSlot = useCallback((id: string, patch: Partial<FileSlot>) => {
    setFileSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  // ─── Core queue processor (parallel) ────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const files = queueRef.current.splice(0)

    // Pre-build all slots as 'pending' so the UI renders them immediately
    const slots: FileSlot[] = files.map((f, i) => ({
      id: `slot-${Date.now()}-${i}`,
      name: truncateName(f.name || `Document ${i + 1}`),
      status: 'pending',
      passengersFound: 0,
      errorMsg: null,
    }))
    setFileSlots(slots)
    setOverallStatus('processing')
    setLastWarnings([])

    const allWarnings: string[] = []
    let successCount = 0

    // Process all images in parallel
    await Promise.all(
      files.map(async (file, i) => {
        const slotId = slots[i].id

        // Resize first, then flip to 'scanning'
        const resized = await resizeImage(file)
        pendingFileRef.current = resized
        updateSlot(slotId, { status: 'scanning' })

        const { ok, data } = await scanWithRetry(resized, () => {
          // retrying — keep 'scanning' status, just note it internally
        })

        const json = data as Record<string, unknown>

        if (!ok) {
          const errText = (json?.error as string) || 'Scan failed — try another image.'
          updateSlot(slotId, { status: 'error', errorMsg: errText })
          return
        }

        const scanResult = json as ScanResult
        const count = scanResult.passengers?.length ?? 0
        if (scanResult.warnings?.length) allWarnings.push(...scanResult.warnings)

        updateSlot(slotId, { status: 'done', passengersFound: count })
        onSuccessRef.current(scanResult)
        successCount++
      })
    )

    if (allWarnings.length > 0) setLastWarnings(allWarnings)
    if (successCount > 0) pendingFileRef.current = null

    processingRef.current = false
    setOverallStatus(successCount > 0 ? 'done' : 'error')

    // Auto-clear the slot list after 6s so scanner goes back to idle
    if (successCount > 0) {
      setTimeout(() => {
        setFileSlots([])
        setOverallStatus('idle')
      }, 6000)
    }
  }, [updateSlot])

  const enqueue = useCallback((files: File[]) => {
    if (files.length === 0) return
    queueRef.current = [...queueRef.current, ...files]
    drainQueue()
  }, [drainQueue])

  // ─── File picker ──────────────────────────────────────────────────────────
  const openFileBrowser = useCallback(() => {
    if (processingRef.current) return
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,application/pdf'
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

  // ─── Ctrl+V paste ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const docItems = items.filter(i => i.type.startsWith('image/') || i.type === 'application/pdf')
      if (docItems.length === 0) return
      e.preventDefault()
      const files = docItems.map(i => i.getAsFile()).filter((f): f is File => f !== null)
      if (files.length > 0) enqueue(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enqueue])

  // ─── Drag and drop ────────────────────────────────────────────────────────
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

  // ─── Derived values for the progress bar ─────────────────────────────────
  const totalSlots = fileSlots.length
  const doneSlots = fileSlots.filter(s => s.status === 'done' || s.status === 'error').length
  const successSlots = fileSlots.filter(s => s.status === 'done').length
  const progressPct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0
  const totalPassengersFound = fileSlots.reduce((sum, s) => sum + s.passengersFound, 0)

  const isProcessing = overallStatus === 'processing'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full border-2 border-dashed rounded-lg ${
        isDragging
          ? 'border-accent bg-accent/5'
          : isProcessing
            ? 'border-accent/40 bg-surface'
            : overallStatus === 'done'
              ? 'border-green-400 bg-surface'
              : overallStatus === 'error'
                ? 'border-red-300 bg-surface'
                : 'border-border bg-surface hover:border-accent'
      }`}
    >
      <div className="p-5 space-y-4">

        {/* ── IDLE STATE ──────────────────────────────────────────────────── */}
        {overallStatus === 'idle' && (
          <div className="text-center space-y-3 py-2">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold text-text-primary">Batch Auto-Fill</p>
            </div>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Select one or more passport / visa / ID images, or a passenger list PDF.
              All images are scanned in parallel.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={openFileBrowser}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Documents
              </button>
              <span className="text-xs text-text-secondary">
                or drag & drop / <kbd className="px-1 py-0.5 bg-border rounded font-mono text-xs">Ctrl+V</kbd>
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Supports JPG, PNG, WebP, PDF
            </p>
          </div>
        )}

        {/* ── PROCESSING / DONE / ERROR STATES ────────────────────────────── */}
        {fileSlots.length > 0 && (
          <div className="space-y-3">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <span className="text-accent font-mono text-base leading-none">{spinnerChar}</span>
                    <p className="text-sm font-semibold text-text-primary">
                      Scanning {totalSlots} {totalSlots === 1 ? 'document' : 'documents'}…
                    </p>
                  </>
                ) : overallStatus === 'done' ? (
                  <>
                    <span className="text-green-600 text-base leading-none">✓</span>
                    <p className="text-sm font-semibold text-text-primary">
                      {successSlots === totalSlots
                        ? `All ${totalSlots} ${totalSlots === 1 ? 'document' : 'documents'} scanned`
                        : `${successSlots} of ${totalSlots} succeeded`}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-red-500 text-base leading-none">✕</span>
                    <p className="text-sm font-semibold text-text-primary">Scan failed</p>
                  </>
                )}
              </div>

              {/* Passengers found badge */}
              {totalPassengersFound > 0 && (
                <span className="text-xs font-semibold px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full">
                  {totalPassengersFound} {totalPassengersFound === 1 ? 'passenger' : 'passengers'} found
                </span>
              )}
            </div>

            {/* Progress bar */}
            {totalSlots > 1 && (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progressPct === 100 ? 'bg-green-500' : 'bg-accent'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary text-right">
                  {doneSlots} of {totalSlots} complete
                </p>
              </div>
            )}

            {/* Per-file slot rows */}
            <div className="border border-border rounded-md overflow-hidden">
              {fileSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    idx < fileSlots.length - 1 ? 'border-b border-border/60' : ''
                  } ${
                    slot.status === 'done' ? 'bg-green-50/50' :
                    slot.status === 'error' ? 'bg-red-50/50' :
                    slot.status === 'scanning' ? 'bg-accent/5' :
                    'bg-surface'
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-5 text-center">
                    {slot.status === 'done' && (
                      <span className="text-green-600 text-sm font-bold">✓</span>
                    )}
                    {slot.status === 'error' && (
                      <span className="text-red-500 text-sm font-bold">✕</span>
                    )}
                    {slot.status === 'scanning' && (
                      <span className="text-accent font-mono text-sm">{spinnerChar}</span>
                    )}
                    {slot.status === 'pending' && (
                      <span className="text-text-secondary text-sm">◌</span>
                    )}
                  </div>

                  {/* Filename */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      slot.status === 'done' ? 'text-text-primary' :
                      slot.status === 'error' ? 'text-red-600' :
                      slot.status === 'scanning' ? 'text-text-primary' :
                      'text-text-secondary'
                    }`}>
                      {slot.name}
                    </p>
                    {slot.status === 'error' && slot.errorMsg && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">{slot.errorMsg}</p>
                    )}
                    {slot.status === 'scanning' && (
                      <p className="text-xs text-accent/80 mt-0.5">Reading with AI…</p>
                    )}
                    {slot.status === 'pending' && (
                      <p className="text-xs text-text-secondary/60 mt-0.5">Waiting…</p>
                    )}
                  </div>

                  {/* Right: result or phase label */}
                  <div className="flex-shrink-0 text-right">
                    {slot.status === 'done' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        slot.passengersFound > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {slot.passengersFound > 0
                          ? `${slot.passengersFound} ${slot.passengersFound === 1 ? 'passenger' : 'passengers'}`
                          : 'No data'}
                      </span>
                    )}
                    {slot.status === 'scanning' && (
                      <span className="text-xs text-accent font-medium">Scanning</span>
                    )}
                    {slot.status === 'pending' && (
                      <span className="text-xs text-text-secondary">Queued</span>
                    )}
                    {slot.status === 'error' && (
                      <span className="text-xs text-red-500 font-medium">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {lastWarnings.length > 0 && (overallStatus === 'done' || overallStatus === 'error') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
                <p className="font-semibold">⚠ {lastWarnings.length} {lastWarnings.length === 1 ? 'notice' : 'notices'}:</p>
                {lastWarnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {/* Done: add more / dismiss */}
            {overallStatus === 'done' && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-text-secondary">
                  Review and confirm the extracted data below
                </p>
                <button
                  type="button"
                  onClick={openFileBrowser}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  + Scan more documents
                </button>
              </div>
            )}

            {/* Error state: retry or dismiss */}
            {overallStatus === 'error' && fileSlots.every(s => s.status === 'error') && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openFileBrowser}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Try different images
                </button>
                <button
                  type="button"
                  onClick={() => { setFileSlots([]); setOverallStatus('idle') }}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Dismiss
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
