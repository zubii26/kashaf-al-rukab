'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { createDriver, CreateDriverState } from '../actions'

type Vehicle = {
  id: string
  plate_number: string
  vehicle_type: string | null
}

interface NewDriverFormProps {
  vehicles: Vehicle[] | null
}

export default function NewDriverForm({ vehicles }: NewDriverFormProps) {
  const [state, formAction, isPending] = useActionState<CreateDriverState, FormData>(
    createDriver,
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">

          {state?.error && (
            <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Login Password</label>
              <input name="password" type="text" required className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Full Name</label>
            <input name="full_name" type="text" required className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Nationality <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
              <input name="nationality" type="text" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Mobile Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
              <input name="mobile_number" type="tel" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Residence Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
              <input name="residence_number" type="text" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Card Number (Rukab) <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
              <input name="card_number" type="text" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-medium text-text-primary">Vehicle Assignment <span className="text-sm font-normal text-text-secondary">(Optional)</span></h3>
            <p className="text-sm text-text-secondary bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
              Enter a <strong>Plate Number</strong> to create and assign a vehicle to this driver. Registration details can be added later.
            </p>
            <div className="bg-primary/5 p-4 rounded-md space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    New Vehicle Plate <span className="text-red-500">*</span>
                    <span className="text-xs text-text-secondary font-normal ml-1">(required to assign)</span>
                  </label>
                  <input name="new_vehicle_plate" type="text" placeholder="e.g. ABC 1234" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">New Vehicle Type <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input name="new_vehicle_type" type="text" placeholder="e.g. Sedan, SUV, Bus..." className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Registration Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input name="new_vehicle_registration" type="text" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Registration Expiry <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input name="new_vehicle_expiry" type="date" className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Driver Photo</label>
            <input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <Link href="/admin/drivers">
              <SecondaryButton type="button" disabled={isPending}>Cancel</SecondaryButton>
            </Link>
            <PrimaryButton type="submit" isLoading={isPending} loadingText="Creating...">
              Create Driver
            </PrimaryButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}