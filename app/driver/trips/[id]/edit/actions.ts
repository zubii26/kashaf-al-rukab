'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/utils/auth'

interface PassengerPayload {
  id: string
  full_name: string
  nationality: string
  passport_number: string
  seq_number: number
  isNew: boolean
  _removed: boolean
}

interface UpdatePayload {
  tripId: string
  trip: {
    pickup_location: string
    dropoff_location: string
    trip_date: string
    trip_time: string
  }
  passengers: PassengerPayload[]
}

export async function updateTripAction(payload: UpdatePayload) {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Use cached auth — deduplicates getUser() within this request
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { tripId, trip, passengers } = payload

  // 1. Update trip details
  const { error: tripError } = await supabase
    .from('trips')
    .update({
      pickup_location: trip.pickup_location,
      dropoff_location: trip.dropoff_location,
      trip_date: trip.trip_date,
      trip_time: trip.trip_time,
    })
    .eq('id', tripId)

  if (tripError) {
    console.error('[updateTripAction] trip update error:', tripError.message)
    return { success: false, error: tripError.message }
  }

  // 2. Process each passenger
  for (const p of passengers) {
    if (p._removed && !p.isNew && p.id) {
      // DELETE: remove from trip_passengers (keep passenger record to avoid orphaning)
      await admin.from('trip_passengers').delete()
        .eq('trip_id', tripId)
        .eq('passenger_id', p.id)
      console.log('[updateTripAction] removed passenger link:', p.id)

    } else if (p.isNew || !p.id) {
      // INSERT: new passenger
      if (!p.full_name) continue
      const { data: newP, error: insertErr } = await admin
        .from('passengers')
        .insert({
          full_name: p.full_name,
          nationality: p.nationality || 'Unknown',
          passport_number: p.passport_number || null,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('[updateTripAction] insert passenger error:', insertErr.message)
        continue
      }

      if (newP) {
        await admin.from('trip_passengers').insert({
          trip_id: tripId,
          passenger_id: newP.id,
          seq_number: p.seq_number,
        })
        console.log('[updateTripAction] inserted new passenger:', newP.id)
      }

    } else {
      // UPDATE: existing passenger
      const { error: updateErr } = await admin
        .from('passengers')
        .update({
          full_name: p.full_name,
          nationality: p.nationality,
          passport_number: p.passport_number || null,
        })
        .eq('id', p.id)

      if (updateErr) {
        console.error('[updateTripAction] update passenger error:', updateErr.message)
      }
    }
  }

  revalidatePath('/driver/trips')
  revalidatePath(`/driver/trips/${tripId}/print`)

  return { success: true }
}
