'use client'

import { useState, useTransition } from 'react'
import { Globe, Phone, Pencil, X, Check, Loader2 } from 'lucide-react'
import { updateDriverProfileAction } from './actions'
import { ImageCropper } from '@/components/ui/image-cropper'

interface DriverData {
  full_name: string
  nationality: string | null
  mobile_number: string | null
  residence_number: string | null
  card_number: string | null
  photo_url: string | null
  status: string
}

interface Props {
  driver: DriverData
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

export function DriverProfileEditForm({ driver }: Props) {
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [croppedFile, setCroppedFile] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    if (croppedFile) {
      formData.set('photo_file', croppedFile)
    }

    startTransition(async () => {
      try {
        await updateDriverProfileAction(formData)
        setSuccess(true)
        setEditing(false)
        setCroppedFile(null)
        setTimeout(() => setSuccess(false), 4000)
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      }
    })
  }

  // ── View Mode ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-5">
        {/* Avatar + name row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {driver.photo_url ? (
              <img
                src={driver.photo_url}
                alt={driver.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold flex-shrink-0">
                {driver.full_name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-text-primary">{driver.full_name}</h2>
              <span
                className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                  driver.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {driver.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
          >
            <Pencil size={14} />
            Edit Profile
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            <Check size={14} />
            Profile updated successfully.
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Nationality</p>
            <p className="font-medium text-text-primary flex items-center gap-2">
              <Globe size={14} />
              {driver.nationality || '—'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Mobile</p>
            <p className="font-medium text-text-primary flex items-center gap-2">
              <Phone size={14} />
              {driver.mobile_number || '—'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Iqama / Residence Number</p>
            <p className="font-medium text-text-primary">{driver.residence_number || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Rukab Card Number</p>
            <p className="font-medium text-text-primary">{driver.card_number || '—'}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar + name header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-4 pb-4 border-b border-border">
        {driver.photo_url ? (
          <img
            src={driver.photo_url}
            alt={driver.full_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-border shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {driver.full_name.charAt(0)}
          </div>
        )}
        <div className="space-y-2 flex-1">
          <div>
            <p className="text-xs text-text-secondary mb-1">Editing profile</p>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                driver.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {driver.status}
            </span>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
              Change Photo
            </label>
            <ImageCropper 
              onCropComplete={setCroppedFile} 
              currentImage={croppedFile ? URL.createObjectURL(croppedFile) : driver.photo_url} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            name="full_name"
            type="text"
            required
            defaultValue={driver.full_name}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Nationality
          </label>
          <input
            name="nationality"
            type="text"
            defaultValue={driver.nationality ?? ''}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Mobile Number
          </label>
          <input
            name="mobile_number"
            type="text"
            defaultValue={driver.mobile_number ?? ''}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Iqama / Residence Number
          </label>
          <input
            name="residence_number"
            type="text"
            defaultValue={driver.residence_number ?? ''}
            className={inputClass}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Rukab Card Number
          </label>
          <input
            name="card_number"
            type="text"
            defaultValue={driver.card_number ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => { setEditing(false); setErrorMsg(null) }}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : (
            <><Check size={14} /> Save Changes</>
          )}
        </button>
      </div>
    </form>
  )
}
