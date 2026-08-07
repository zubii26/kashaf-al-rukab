import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { updateAdminTrip, deleteAdminTrip, duplicateTrip } from '../actions'
import Link from 'next/link'

export default async function AdminTripDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('*, drivers(full_name), vehicles(plate_number, vehicle_type)')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  const { data: tripPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(full_name, nationality, passport_number)')
    .eq('trip_id', tripId)
    .order('seq_number', { ascending: true })

  const [{ data: drivers }, { data: vehicles }] = await Promise.all([
    supabase.from('drivers').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('vehicles').select('id, plate_number, vehicle_type').order('plate_number'),
  ])

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/trips" className="text-text-secondary hover:text-primary text-sm">← Trips</Link>
            <h1 className="text-3xl font-bold text-text-primary mt-1">Trip #{trip.trip_number}</h1>
          </div>
          <div className="flex gap-3">
            {/* Print */}
            <Link href={`/driver/trips/${trip.id}/print`} target="_blank"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
              🖨 Print Manifest
            </Link>
            {/* Duplicate */}
            <form action={duplicateTrip}>
              <input type="hidden" name="id" value={trip.id} />
              <button type="submit" className="px-4 py-2 border border-border text-sm font-medium rounded-md hover:bg-surface transition-colors">
                Duplicate
              </button>
            </form>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader><CardTitle>Edit Trip</CardTitle></CardHeader>
          <CardContent>
            <form action={updateAdminTrip} className="space-y-4">
              <input type="hidden" name="id" value={trip.id} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Driver</label>
                  <select name="driver_id" defaultValue={trip.driver_id}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {drivers?.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Vehicle</label>
                  <select name="vehicle_id" defaultValue={trip.vehicle_id}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {vehicles?.map(v => <option key={v.id} value={v.id}>{v.plate_number} – {v.vehicle_type}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Pickup Location</label>
                  <input name="pickup_location" type="text" required defaultValue={trip.pickup_location}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Dropoff Location</label>
                  <input name="dropoff_location" type="text" required defaultValue={trip.dropoff_location}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Date</label>
                  <input name="trip_date" type="date" required
                    defaultValue={trip.trip_date}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Time</label>
                  <input name="trip_time" type="time" required defaultValue={trip.trip_time}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Status</label>
                  <select name="status" defaultValue={trip.status}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Price (SAR)</label>
                  <input name="price" type="number" min="0" step="0.01" defaultValue={Number(trip.price)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Price Type</label>
                  <select name="price_type" defaultValue={trip.price_type}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="cash">Cash</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <form action={deleteAdminTrip}>
                  <input type="hidden" name="id" value={trip.id} />
                  <button type="submit"
                    
                    className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 transition-colors">
                    Delete Trip
                  </button>
                </form>
                <div className="flex gap-2">
                  <Link href="/admin/trips"><SecondaryButton type="button">Cancel</SecondaryButton></Link>
                  <PrimaryButton type="submit">Save Changes</PrimaryButton>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Passengers */}
        <Card>
          <CardHeader><CardTitle>Passengers ({tripPassengers?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!tripPassengers || tripPassengers.length === 0 ? (
              <p className="text-text-secondary text-sm">No passengers on this trip.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="py-2 text-left font-medium w-8">#</th>
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-left font-medium">Nationality</th>
                    <th className="py-2 text-left font-medium">Passport</th>
                  </tr>
                </thead>
                <tbody>
                  {tripPassengers.map((tp: any) => (
                    <tr key={tp.seq_number} className="border-b border-border last:border-0">
                      <td className="py-2 text-text-secondary">{tp.seq_number}</td>
                      <td className="py-2 font-medium">{tp.passengers?.full_name}</td>
                      <td className="py-2">{tp.passengers?.nationality}</td>
                      <td className="py-2 text-text-secondary">{tp.passengers?.passport_number ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}