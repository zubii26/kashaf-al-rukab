'use client'

import { useState, useTransition } from 'react'
import { Pencil, X, Check, Loader2, Car } from 'lucide-react'
import { updateDriverVehicleAction } from './actions'

interface VehicleData {
  plate_number: string
  vehicle_type: string
  registration_number: string
  registration_expiry: string
}

interface Props {
  vehicle: VehicleData | null
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

export function DriverVehicleEditForm({ vehicle }: Props) {
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateDriverVehicleAction(formData)
        setSuccess(true)
        setEditing(false)
        setTimeout(() => setSuccess(false), 4000)
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      }
    })
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-4">
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            <Check size={14} />
            Vehicle updated successfully.
          </div>
        )}

        <div className="flex items-center justify-between">
          {!vehicle ? (
            <p className="text-text-secondary text-sm">No vehicle assigned.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm flex-1">
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Plate Number</p>
                <p className="font-bold text-text-primary text-lg">{vehicle.plate_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Vehicle Type</p>
                <p className="font-medium text-text-primary">{vehicle.vehicle_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Registration Number</p>
                <p className="font-medium text-text-primary">{vehicle.registration_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Registration Expiry</p>
                <p className={`font-medium ${new Date(vehicle.registration_expiry) < new Date() ? 'text-red-500' : 'text-text-primary'}`}>
                  {new Date(vehicle.registration_expiry).toLocaleDateString()}
                  {new Date(vehicle.registration_expiry) < new Date() && ' ⚠️ EXPIRED'}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors ml-4 flex-shrink-0"
          >
            <Pencil size={14} />
            {vehicle ? 'Change Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </div>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-text-secondary">
        Enter your vehicle's plate number and type. If the plate is already in the system it will be reused; otherwise a new vehicle record is created.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Plate Number <span className="text-red-500">*</span>
          </label>
          <input
            name="plate_number"
            type="text"
            placeholder="e.g. 1279 H S A"
            defaultValue={vehicle?.plate_number ?? ''}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <input
            name="vehicle_type"
            type="text"
            placeholder="e.g. STAREX, BUS, VAN"
            defaultValue={vehicle?.vehicle_type ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-text-secondary/70 flex items-center gap-1">
        <Car size={12} />
        Registration number and expiry are managed by the admin.
      </p>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        {/* Unassign link */}
        {vehicle && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const fd = new FormData()
              fd.append('plate_number', '')
              fd.append('vehicle_type', '')
              startTransition(async () => {
                try {
                  await updateDriverVehicleAction(fd)
                  setSuccess(true)
                  setEditing(false)
                  setTimeout(() => setSuccess(false), 4000)
                } catch (err: unknown) {
                  setErrorMsg(err instanceof Error ? err.message : 'Failed to remove vehicle.')
                }
              })
            }}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            Remove vehicle
          </button>
        )}

        <div className="flex items-center gap-3 ml-auto">
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
              <><Check size={14} /> Save Vehicle</>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
