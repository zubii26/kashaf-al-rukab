import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import NewAdminTripForm from './trip-form'

export default async function NewAdminTripPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>
}) {
  const { bookingId } = await searchParams
  const supabase = await createClient()

  const [{ data: drivers }, { data: vehicles }] = await Promise.all([
    supabase.from('drivers').select('id, full_name, vehicle_id, nationality').eq('status', 'active').order('full_name'),
    supabase.from('vehicles').select('id, plate_number, vehicle_type').order('plate_number'),
  ])

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">New Trip</h1>
          {bookingId && (
            <p className="text-text-secondary text-sm mt-1">Linked to booking #{bookingId.slice(0, 8)}…</p>
          )}
        </div>
        <NewAdminTripForm
          drivers={drivers ?? []}
          vehicles={vehicles ?? []}
          bookingId={bookingId}
        />
      </div>
    </PageLayout>
  )
}
