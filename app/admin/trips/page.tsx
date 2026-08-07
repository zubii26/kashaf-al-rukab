import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { deleteAdminTrip, duplicateTrip } from './actions'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string; status?: string; date?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('trips')
    .select('*, drivers(full_name), vehicles(plate_number)')
    .order('trip_date', { ascending: false })

  if (params.driver) query = query.eq('driver_id', params.driver)
  if (params.status) query = query.eq('status', params.status as any)
  if (params.date) query = query.eq('trip_date', params.date)
  if (params.q) {
    query = query.or(`pickup_location.ilike.%${params.q}%,dropoff_location.ilike.%${params.q}%`)
  }

  const { data: trips } = await query
  const { data: drivers } = await supabase.from('drivers').select('id, full_name').order('full_name')

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Trips</h1>
        <Link href="/admin/trips/new">
          <PrimaryButton>+ New Trip</PrimaryButton>
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search route..."
          className="px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
        />
        <select name="driver" defaultValue={params.driver ?? ''}
          className="px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none">
          <option value="">All Drivers</option>
          {drivers?.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <select name="status" defaultValue={params.status ?? ''}
          className="px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none">
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input name="date" type="date" defaultValue={params.date ?? ''}
          className="px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none" />
        <PrimaryButton type="submit" className="px-4 py-2 text-sm">Filter</PrimaryButton>
        <Link href="/admin/trips" className="px-4 py-2 text-sm border border-border rounded-md text-text-secondary hover:text-primary transition-colors">Clear</Link>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-text-secondary text-sm">
                  <th className="p-4 font-medium">Trip #</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Route</th>
                  <th className="p-4 font-medium">Driver</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!trips || trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">No trips found.</td>
                  </tr>
                ) : null}
                {trips?.map((trip: any) => (
                  <tr key={trip.id} className="border-b border-border last:border-0 text-text-primary hover:bg-surface/50">
                    <td className="p-4 font-bold text-primary">#{trip.trip_number}</td>
                    <td className="p-4 text-sm">{new Date(trip.trip_date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm">
                      <div className="font-medium">{trip.pickup_location}</div>
                      <div className="text-text-secondary">→ {trip.dropoff_location}</div>
                    </td>
                    <td className="p-4 text-sm">{trip.drivers?.full_name ?? '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[trip.status] || ''}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link href={`/admin/trips/${trip.id}`}>
                          <button className="px-2 py-1 text-xs border border-border rounded hover:bg-surface transition-colors">Edit</button>
                        </Link>
                        {/* Print link — reuse driver print page */}
                        <Link href={`/driver/trips/${trip.id}/print`} target="_blank">
                          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
                        </Link>
                        {/* Duplicate */}
                        <form action={duplicateTrip}>
                          <input type="hidden" name="id" value={trip.id} />
                          <button type="submit" className="px-2 py-1 text-xs border border-border rounded hover:bg-surface transition-colors">Duplicate</button>
                        </form>
                        {/* Delete */}
                        <form action={deleteAdminTrip}>
                          <input type="hidden" name="id" value={trip.id} />
                          <button type="submit"
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
