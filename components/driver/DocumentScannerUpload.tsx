'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ExtractedPassenger, ScanResult } from '@/lib/ai/extractDocument'

// Re-export so consumer pages can import from one place
export type { ExtractedPassenger, ScanResult }

// ─── Limits ──────────────────────────────────────────────────────────────────
const MAX_BATCH      = 12   // hard cap — user sees a clear error if exceeded
const MAX_CONCURRENT = 4    // max Gemini API requests in-flight at once

// ─── PDF detection ───────────────────────────────────────────────────────────
function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

// ─── Image resize (cost control + accuracy) ──────────────────────────────────
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

// ─── Concurrency pool ─────────────────────────────────────────────────────────
// Runs tasks with at most `limit` in-flight at a time.
// As each task finishes, the next one starts immediately.
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const current = idx++
      results[current] = await tasks[current]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

// ─── Network retry helper ─────────────────────────────────────────────────────
const MAX_RETRIES = 3

async function scanWithRetry(
  resizedFile: File,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  let lastErr: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
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

// ─── Braille spinner (JS-driven — CSS animations are globally disabled) ───────
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
  name: string        // truncated display name (≤28 chars for layout)
  fullName: string    // exact original filename — always shown on error rows
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
  const [batchError, setBatchError] = useState<string | null>(null)

  const processingRef = useRef(false)
  const queueRef = useRef<File[]>([])
  const onSuccessRef = useRef(onBatchScanSuccess)
  useEffect(() => { onSuccessRef.current = onBatchScanSuccess }, [onBatchScanSuccess])

  const isAnyScanning = fileSlots.some(s => s.status === 'scanning')
  const spinnerChar = useSpinner(isAnyScanning)

  // ─── Slot updater ─────────────────────────────────────────────────────────
  const updateSlot = useCallback((id: string, patch: Partial<FileSlot>) => {
    setFileSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  // ─── Core processor with concurrency pool ─────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const files = queueRef.current.splice(0)

    // ── Hard limit: max 12 images ──────────────────────────────────────────
    if (files.length > MAX_BATCH) {
      setBatchError(`Maximum ${MAX_BATCH} images per batch. You selected ${files.length}. Please select up to ${MAX_BATCH} files.`)
      processingRef.current = false
      return
    }
    setBatchError(null)

    // Pre-build all slots as 'pending' so the UI renders them immediately
    const slots: FileSlot[] = files.map((f, i) => ({
      id: `slot-${Date.now()}-${i}`,
      name: truncateName(f.name || `Document ${i + 1}`),
      fullName: f.name || `Document ${i + 1}`,
      status: 'pending',
      passengersFound: 0,
      errorMsg: null,
    }))
    setFileSlots(slots)
    setOverallStatus('processing')
    setLastWarnings([])

    const allWarnings: string[] = []
    let successCount = 0

    // Build tasks for the concurrency pool (max MAX_CONCURRENT at a time)
    const tasks = files.map((file, i) => async () => {
      const slotId = slots[i].id

      const resized = await resizeImage(file)
      updateSlot(slotId, { status: 'scanning' })

      const { ok, data } = await scanWithRetry(resized)
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

    // Run with concurrency pool — at most MAX_CONCURRENT (4) in-flight at once
    await runWithConcurrency(tasks, MAX_CONCURRENT)

    if (allWarnings.length > 0) setLastWarnings(allWarnings)

    processingRef.current = false
    setOverallStatus(successCount > 0 ? 'done' : 'error')

    // Auto-clear after 6s only if everything succeeded
    if (successCount > 0 && successCount === files.length) {
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

  // ─── Derived values ───────────────────────────────────────────────────────
  const totalSlots = fileSlots.length
  const doneSlots = fileSlots.filter(s => s.status === 'done' || s.status === 'error').length
  const successSlots = fileSlots.filter(s => s.status === 'done').length
  const errorSlots = fileSlots.filter(s => s.status === 'error').length
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

        {/* ── BATCH LIMIT ERROR ───────────────────────────────────────────── */}
        {batchError && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-500 text-base leading-none flex-shrink-0 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700">Too many files selected</p>
              <p className="text-xs text-red-600 mt-0.5">{batchError}</p>
            </div>
            <button
              type="button"
              onClick={() => setBatchError(null)}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── IDLE STATE ──────────────────────────────────────────────────── */}
        {overallStatus === 'idle' && !batchError && (
          <div className="text-center space-y-3 py-2">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold text-text-primary">Batch Auto-Fill</p>
            </div>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Select up to <strong>{MAX_BATCH} documents</strong> at once — passports, visas, or ID images.
              Scanned {MAX_CONCURRENT} at a time for best accuracy.
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
              JPG · PNG · WebP · PDF &nbsp;|&nbsp; Max {MAX_BATCH} files per batch
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
                      {errorSlots === 0
                        ? `All ${totalSlots} ${totalSlots === 1 ? 'document' : 'documents'} scanned`
                        : `${successSlots} of ${totalSlots} succeeded · ${errorSlots} failed`}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-red-500 text-base leading-none">✕</span>
                    <p className="text-sm font-semibold text-text-primary">Scan failed</p>
                  </>
                )}
              </div>

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
                    className={`h-full rounded-full ${
                      progressPct === 100
                        ? errorSlots > 0 ? 'bg-amber-400' : 'bg-green-500'
                        : 'bg-accent'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>
                    {isProcessing
                      ? `${Math.min(MAX_CONCURRENT, totalSlots - doneSlots)} scanning in parallel`
                      : `${doneSlots} complete`}
                  </span>
                  <span>{doneSlots} of {totalSlots}</span>
                </div>
              </div>
            )}

            {/* Per-file slot rows */}
            <div className="border border-border rounded-md overflow-hidden">
              {fileSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className={`flex items-start gap-3 px-3 py-2.5 ${
                    idx < fileSlots.length - 1 ? 'border-b border-border/60' : ''
                  } ${
                    slot.status === 'done' ? 'bg-green-50/50' :
                    slot.status === 'error' ? 'bg-red-50/60' :
                    slot.status === 'scanning' ? 'bg-accent/5' :
                    'bg-surface'
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-5 text-center mt-0.5">
                    {slot.status === 'done' && <span className="text-green-600 text-sm font-bold">✓</span>}
                    {slot.status === 'error' && <span className="text-red-500 text-sm font-bold">✕</span>}
                    {slot.status === 'scanning' && <span className="text-accent font-mono text-sm">{spinnerChar}</span>}
                    {slot.status === 'pending' && <span className="text-text-secondary text-sm">◌</span>}
                  </div>

                  {/* Filename + status text */}
                  <div className="flex-1 min-w-0">
                    {slot.status === 'error' ? (
                      // Error: show FULL filename — untruncated, selectable, copyable
                      <>
                        <p
                          className="text-xs font-mono font-semibold text-red-700 break-all select-all cursor-text"
                          title="Click to select filename"
                        >
                          {slot.fullName}
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">{slot.errorMsg}</p>
                      </>
                    ) : (
                      // Normal: show truncated name + status
                      <>
                        <p className={`text-xs font-medium truncate ${
                          slot.status === 'done' ? 'text-text-primary' :
                          slot.status === 'scanning' ? 'text-text-primary' :
                          'text-text-secondary'
                        }`}>
                          {slot.name}
                        </p>
                        {slot.status === 'scanning' && (
                          <p className="text-xs text-accent/80 mt-0.5">Reading with AI…</p>
                        )}
                        {slot.status === 'pending' && (
                          <p className="text-xs text-text-secondary/60 mt-0.5">Queued…</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right badge */}
                  <div className="flex-shrink-0 text-right mt-0.5">
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

            {/* Failed files summary — clearly listed */}
            {errorSlots > 0 && (overallStatus === 'done' || overallStatus === 'error') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold text-red-700">
                  {errorSlots} {errorSlots === 1 ? 'file' : 'files'} failed to scan:
                </p>
                {fileSlots.filter(s => s.status === 'error').map((s) => (
                  <p key={s.id} className="text-xs font-mono text-red-600 break-all select-all">
                    • {s.fullName}
                  </p>
                ))}
                <p className="text-xs text-red-500 mt-1">
                  Locate these files and try uploading them again with better lighting or a clearer photo.
                </p>
              </div>
            )}

            {/* Warnings */}
            {lastWarnings.length > 0 && (overallStatus === 'done' || overallStatus === 'error') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
                <p className="font-semibold">⚠ {lastWarnings.length} {lastWarnings.length === 1 ? 'notice' : 'notices'}:</p>
                {lastWarnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {/* Done footer */}
            {(overallStatus === 'done' || overallStatus === 'error') && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-text-secondary">
                  {successSlots > 0 ? 'Review and confirm the extracted data below' : 'Please try again with clearer images'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFileSlots([])
                    setOverallStatus('idle')
                    setBatchError(null)
                  }}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  + Scan more documents
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
