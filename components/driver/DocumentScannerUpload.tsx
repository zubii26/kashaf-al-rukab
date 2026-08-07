'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type ExtractedData = {
  full_name: string | null
  nationality: string | null
  passport_number: string | null
  visa_number: string | null
}

interface DocumentScannerUploadProps {
  onBatchScanSuccess: (data: ExtractedData, file: File) => void
}

export function DocumentScannerUpload({ onBatchScanSuccess }: DocumentScannerUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [queue, setQueue] = useState<File[]>([])
  const [processingIndex, setProcessingIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: File[]) => {
    setQueue(prev => [...prev, ...files])
  }, [])

  useEffect(() => {
    let mounted = true

    const processQueue = async () => {
      if (isProcessing || queue.length === processingIndex) return
      setIsProcessing(true)
      setError(null)

      const file = queue[processingIndex]
      
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/scan-document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to scan document')
        }

        const data: ExtractedData = await response.json()
        if (mounted) {
          onBatchScanSuccess(data, file)
        }
      } catch (err: any) {
        console.error(err)
        if (mounted) setError(err.message || 'An error occurred during scanning')
      } finally {
        if (mounted) {
          setProcessingIndex(prev => prev + 1)
          setIsProcessing(false)
        }
      }
    }

    processQueue()

    return () => {
      mounted = false
    }
  }, [queue, processingIndex, isProcessing, onBatchScanSuccess])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
      if (files.length > 0) {
        processFiles(files)
      }
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (e.clipboardData?.files) {
        const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'))
        if (files.length > 0) {
          e.preventDefault()
          processFiles(files)
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [processFiles])

  // Reset queue when done
  useEffect(() => {
    if (queue.length > 0 && processingIndex >= queue.length) {
      const timer = setTimeout(() => {
        setQueue([])
        setProcessingIndex(0)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [queue.length, processingIndex])

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50' 
          : queue.length > 0 && processingIndex < queue.length
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {queue.length > 0 && processingIndex < queue.length ? (
        <div className="flex flex-col items-center justify-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-blue-800 font-semibold">
            Scanning document {processingIndex + 1} of {queue.length}...
          </div>
          <div className="text-sm text-blue-600/80">AI is extracting passenger details automatically</div>
        </div>
      ) : queue.length > 0 && processingIndex >= queue.length ? (
        <div className="flex flex-col items-center justify-center space-y-2 text-emerald-600">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="font-semibold">Successfully scanned {queue.length} documents!</div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3 text-slate-500">
          <div className="p-3 bg-white shadow-sm rounded-full mb-1">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Batch Auto-Fill</h3>
          <p className="text-sm max-w-sm mx-auto leading-relaxed">
            Drag & drop multiple passport/visa images here, or simply press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded border border-slate-300 text-slate-700 font-mono text-xs font-bold">Ctrl+V</kbd> to paste. 
            The AI will extract the data and add all passengers automatically.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
          Error scanning previous document: {error}
        </div>
      )}
    </div>
  )
}
