'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { updateDriver } from '../actions'
import { ImageCropper } from '@/components/ui/image-cropper'

type Vehicle = {
  id: string
  plate_number: string
  vehicle_type: string | null
}

interface EditDriverFormProps {
  driver: any
  vehicles: Vehicle[] | null
}

export default function EditDriverForm({ driver, vehicles }: EditDriverFormProps) {
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    if (croppedFile) {
      formData.set('photo_file', croppedFile)
    }
    try {
      await updateDriver(formData)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="id" value={driver.id} />
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">Full Name</label>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={driver.full_name}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Nationality</label>
          <input
            name="nationality"
            type="text"
            required
            defaultValue={driver.nationality}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Mobile Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
          <input
            name="mobile_number"
            type="tel"
            defaultValue={driver.mobile_number}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Residence Number</label>
          <input
            name="residence_number"
            type="text"
            required
            defaultValue={driver.residence_number}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Card Number (Rukab)</label>
          <input
            name="card_number"
            type="text"
            required
            defaultValue={driver.card_number}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Assign Vehicle</label>
          <select
            name="vehicle_id"
            defaultValue={driver.vehicle_id || ''}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Unassigned</option>
            {vehicles?.map(v => (
              <option key={v.id} value={v.id}>{v.plate_number} - {v.vehicle_type}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Status</label>
          <select
            name="status"
            defaultValue={driver.status}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <label className="text-sm font-medium text-text-primary block">Driver Photo</label>
        <ImageCropper 
          onCropComplete={setCroppedFile}
          currentImage={croppedFile ? URL.createObjectURL(croppedFile) : driver.photo_url}
        />
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Link href="/admin/drivers">
          <SecondaryButton type="button" disabled={isPending}>Cancel</SecondaryButton>
        </Link>
        <PrimaryButton type="submit" isLoading={isPending} loadingText="Saving...">Save Changes</PrimaryButton>
      </div>
    </form>
  )
}
