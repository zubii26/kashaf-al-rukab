import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import EditTripForm from './edit-form'
import { getAuthenticatedUser } from '@/lib/utils/auth'

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { id } = await params

  // Use cached auth — deduplicates getUser() within this request
  const user = await getAuthenticatedUser()
  if (!user) return <div>Not authenticated</div>

  // Fetch trip details
  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  // Fetch ALL passengers via admin client (bypasses RLS)
  const { data: tripPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(id, full_name, nationality, passport_number)')
    .eq('trip_id', id)
    .order('seq_number', { ascending: true })

  const passengers = (tripPassengers || [])
    .map((tp: any) => ({
      id: tp.passengers?.id || '',
      full_name: tp.passengers?.full_name || '',
      nationality: tp.passengers?.nationality || '',
      passport_number: tp.passengers?.passport_number || '',
      seq_number: tp.seq_number,
      isNew: false,
    }))
    .filter((p) => p.id)

  return (
    <EditTripForm
      tripId={id}
      initialTrip={{
        pickup_location: trip.pickup_location,
        dropoff_location: trip.dropoff_location,
        trip_date: trip.trip_date,
        trip_time: trip.trip_time || '',
      }}
      initialPassengers={passengers}
    />
  )
}
