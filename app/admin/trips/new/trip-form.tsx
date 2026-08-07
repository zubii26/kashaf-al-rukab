'use client'

import { useState } from 'react'
import { createAdminTrip } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Driver { id: string; full_name: string; vehicle_id: string | null; nationality: string }
interface Vehicle { id: string; plate_number: string; vehicle_type: string }

export default function NewAdminTripForm({
  drivers,
  vehicles,
  bookingId,
}: {
  drivers: Driver[]
  vehicles: Vehicle[]
  bookingId?: string
}) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [passengers, setPassengers] = useState<{ name: string; nationality: string; id_number: string }[]>([])

  const autoVehicleId = selectedDriver?.vehicle_id ?? ''
  const autoVehicle = vehicles.find(v => v.id === autoVehicleId)

  const addPassenger = () => setPassengers(p => [...p, { name: '', nationality: '', id_number: '' }])
  const removePassenger = (i: number) => setPassengers(p => p.filter((_, idx) => idx !== i))
  const updatePassenger = (i: number, field: string, value: string) => {
    setPassengers(p => p.map((px, idx) => idx === i ? { ...px, [field]: value } : px))
  }

  return (
    <form action={createAdminTrip} className="space-y-6">
      <input type="hidden" name="passengers_json" value={JSON.stringify(passengers)} />
      {bookingId && <input type="hidden" name="booking_id" value={bookingId} />}

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-text-primary text-lg border-b border-border pb-2">Trip Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Driver</label>
              <select
                name="driver_id"
                required
                onChange={e => setSelectedDriver(drivers.find(d => d.id === e.target.value) ?? null)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Vehicle</label>
              <select
                name="vehicle_id"
                required
                value={autoVehicleId}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                onChange={() => {}}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} – {v.vehicle_type}
                    {v.id === autoVehicleId ? ' (driver\'s vehicle)' : ''}
                  </option>
                ))}
              </select>
              {autoVehicle && (
                <p className="text-xs text-green-600">Auto-filled from driver's assigned vehicle</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Pickup Location</label>
              <input name="pickup_location" type="text" required placeholder="e.g. MAKKAH HOTEL"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Dropoff Location</label>
              <input name="dropoff_location" type="text" required placeholder="e.g. JEDDAH AIRPORT"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Trip Date</label>
              <input name="trip_date" type="date" required
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Trip Time</label>
              <input name="trip_time" type="time" required
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Price (SAR)</label>
              <input name="price" type="number" min="0" step="0.01" defaultValue="0"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Price Type</label>
            <select name="price_type" defaultValue="cash"
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="cash">Cash</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Passengers */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-text-primary text-lg">Passengers</h2>
            <button type="button" onClick={addPassenger}
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
              + Add Passenger
            </button>
          </div>

          {passengers.length === 0 && (
            <p className="text-text-secondary text-sm text-center py-4">No passengers added yet.</p>
          )}

          {passengers.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end border border-border rounded-md p-3">
              <div className="col-span-4 space-y-1">
                <label className="text-xs text-text-secondary">Name</label>
                <input type="text" value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)}
                  placeholder="Full name"
                  className="w-full px-2 py-1.5 border border-border rounded text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="col-span-4 space-y-1">
                <label className="text-xs text-text-secondary">Nationality</label>
                <input type="text" value={p.nationality} onChange={e => updatePassenger(i, 'nationality', e.target.value)}
                  placeholder="e.g. Saudi"
                  className="w-full px-2 py-1.5 border border-border rounded text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-text-secondary">Passport / ID</label>
                <input type="text" value={p.id_number} onChange={e => updatePassenger(i, 'id_number', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2 py-1.5 border border-border rounded text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button type="button" onClick={() => removePassenger(i)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={bookingId ? `/admin/bookings/${bookingId}` : '/admin/trips'}
          className="px-5 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-primary transition-colors">
          Cancel
        </Link>
        <button type="submit"
          className="px-6 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors">
          Create Trip
        </button>
      </div>
    </form>
  )
}
