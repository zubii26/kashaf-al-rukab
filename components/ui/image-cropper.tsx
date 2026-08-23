'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check, Crop as CropIcon, Image as ImageIcon } from 'lucide-react'

interface ImageCropperProps {
  onCropComplete: (croppedFile: File) => void
  currentImage?: string | null
  aspectRatio?: number
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export function ImageCropper({ onCropComplete, currentImage, aspectRatio = 3 / 4 }: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setCrop(undefined) // Makes crop preview update between images.
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '')
        setIsModalOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspectRatio))
  }

  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current) return

    setIsProcessing(true)
    
    try {
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height

      // ── Performance cap ─────────────────────────────────────────────────────
      // Cap output at 800×1067px (3:4 portrait at ~200 DPI for the 75×100px
      // PDF box). Without a cap, a 4K source photo at devicePixelRatio=2 could
      // produce an 8000×10666px canvas → 3–8 MB JPEG taking 5–15s to upload.
      // At 800×1067px the file is 80–200 KB and prints sharply at all PDF sizes.
      const MAX_WIDTH  = 800
      const MAX_HEIGHT = 1067
      const naturalW   = completedCrop.width  * scaleX
      const naturalH   = completedCrop.height * scaleY
      const scale      = Math.min(1, MAX_WIDTH / naturalW, MAX_HEIGHT / naturalH)
      const outW       = Math.round(naturalW * scale)
      const outH       = Math.round(naturalH * scale)
      // ────────────────────────────────────────────────────────────────────────

      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        naturalW,
        naturalH,
        0,
        0,
        outW,
        outH
      )

      // Quality 0.82 = ~30-40% smaller than 0.95 with no visible difference
      // at the 75×100px render size used in PDF print headers.
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty')
          setIsProcessing(false)
          return
        }
        
        // Always output as JPEG regardless of source format
        const file = new File([blob], 'driver-photo.jpeg', { type: 'image/jpeg' })
        
        // Pass the cropped file up to the parent component
        onCropComplete(file)
        
        // Close modal
        setIsModalOpen(false)
        setIsProcessing(false)
      }, 'image/jpeg', 0.82)
    } catch (e) {
      console.error('Failed to crop image', e)
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {currentImage && !isModalOpen && (
        <div className="mb-3 flex flex-col items-center sm:items-start">
          <img 
            src={currentImage} 
            alt="Current" 
            loading="lazy"
            className="w-24 h-32 object-cover border-2 border-border rounded-md shadow-sm" 
          />
        </div>
      )}
      
      <div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          ref={fileInputRef}
          onChange={onSelectFile}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md font-medium text-sm hover:bg-primary/20 transition-colors"
        >
          <ImageIcon size={16} />
          {currentImage ? 'Change Photo' : 'Upload Photo'}
        </button>
        <p className="text-xs text-text-secondary mt-2 max-w-sm">
          A portrait of the face is recommended. You will be able to crop it.
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
              <h3 className="font-bold text-lg flex items-center gap-2 text-text-primary">
                <CropIcon size={18} />
                Crop Photo
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-border transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1 flex flex-col items-center justify-center bg-black/5">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ maxHeight: '60vh', objectFit: 'contain' }}
                />
              </ReactCrop>
            </div>
            
            <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="px-4 py-2 border border-border rounded-md font-medium text-sm text-text-secondary hover:bg-border/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : (
                  <>
                    <Check size={16} />
                    Apply Crop
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
