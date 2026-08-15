'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedDriver } from '@/lib/utils/auth'

export async function createTripAction(formData: FormData) {
  const supabase = await createClient()
  
  // Use cached auth — deduplicates getUser() within this request
  const driverAuth = await getAuthenticatedDriver()
  if (!driverAuth) {
    throw new Error('Not authenticated or driver profile not found')
  }

  const driver = { id: driverAuth.driverId, vehicle_id: driverAuth.vehicleId }

  // 3. Extract form data
  const pickup_location = formData.get('pickup_location') as string
  const dropoff_location = formData.get('dropoff_location') as string
  const trip_date = formData.get('trip_date') as string
  const trip_time = formData.get('trip_time') as string
  
  // New fields from the updated form layout
  const first_guest_name = formData.get('first_guest_name') as string
  const first_guest_nationality = formData.get('first_guest_nationality') as string
  const first_guest_id = formData.get('first_guest_id') as string
  const first_guest_contact = formData.get('first_guest_contact') as string
  const first_guest_document_image_url = (formData.get('first_guest_document_image_url') as string) || null
  
  // Default values for fields not shown in UI
  const price = 0
  const price_type = 'cash'
  
  // Extract passengers JSON
  const passengersJson = formData.get('passengers_json') as string
  let extraPassengers: Array<{ name: string, nationality: string, id_number: string }> = []
  if (passengersJson) {
    try {
      extraPassengers = JSON.parse(passengersJson)
    } catch (e) {
      console.error('Failed to parse passengers', e)
    }
  }

  // 4. Insert into trips
  if (!driver.vehicle_id) throw new Error('No vehicle assigned to driver')

  const { data: newTrip, error } = await supabase
    .from('trips')
    .insert({
      driver_id: driver.id,
      vehicle_id: driver.vehicle_id,
      pickup_location,
      dropoff_location,
      trip_date,
      trip_time,
      price,
      price_type,
      status: 'scheduled'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating trip:', error)
    throw new Error('Failed to create trip: ' + error.message)
  }

  const admin = createAdminClient()

  // ── Build all passengers list (first guest + extra) ──────────────────────
  const allPassengers = [
    {
      full_name: first_guest_name,
      nationality: first_guest_nationality,
      passport_number: first_guest_id || null,
      document_image_url: first_guest_document_image_url || null,
    },
    ...extraPassengers
      .filter((p) => !!p.name)
      .map((p) => ({
        full_name: p.name,
        nationality: p.nationality || 'Unknown',
        passport_number: p.id_number || null,
        document_image_url: (p as any).document_image_url || null,
      })),
  ]

  // ── Bulk insert ALL passengers in ONE call ────────────────────────────────
  const { data: insertedPassengers, error: passError } = await admin
    .from('passengers')
    .insert(allPassengers)
    .select('id')

  if (passError) {
    console.error('[createTripAction] passenger bulk insert error:', passError.message)
  }

  // ── Bulk insert ALL trip_passenger links in ONE call ─────────────────────
  if (insertedPassengers && insertedPassengers.length > 0) {
    const links = insertedPassengers.map((p, i) => ({
      trip_id: newTrip.id,
      passenger_id: p.id,
      seq_number: i + 1,
    }))

    const { error: linkError } = await admin.from('trip_passengers').insert(links)
    if (linkError) {
      console.error('[createTripAction] trip_passengers bulk link error:', linkError.message)
    }
  }

  // Extract the submit button action (save vs print)
  const submitAction = formData.get('action') as string

  // Revalidate and redirect
  revalidatePath('/driver/trips')

  if (submitAction === 'print') {
    redirect(`/driver/trips/${newTrip.id}/print`)
  }

  return {
    success: true,
    tripId: newTrip.id,
    tripNumber: newTrip.trip_number,
    message: `Trip #${newTrip.trip_number} saved successfully!`
  }
}

export async function deleteTripAction(formData: FormData) {
  const tripId = formData.get('trip_id') as string
  if (!tripId) return

  const supabase = await createClient()

  // Use cached auth — deduplicates getUser() within this request
  const driverAuth = await getAuthenticatedDriver()
  if (!driverAuth) return

  const driver = { id: driverAuth.driverId }

  // Delete only if this trip belongs to this driver
  await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('driver_id', driver.id)

  revalidatePath('/driver/trips')
}
