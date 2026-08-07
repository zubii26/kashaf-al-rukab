'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createAdminTrip(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const driver_id = formData.get('driver_id') as string
  const vehicle_id = formData.get('vehicle_id') as string
  const booking_id = formData.get('booking_id') as string | null
  const pickup_location = formData.get('pickup_location') as string
  const dropoff_location = formData.get('dropoff_location') as string
  const trip_date = formData.get('trip_date') as string
  const trip_time = formData.get('trip_time') as string
  const price = parseFloat(formData.get('price') as string || '0')
  const price_type = formData.get('price_type') as 'cash' | 'deferred'

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      driver_id,
      vehicle_id,
      booking_id: booking_id || null,
      pickup_location,
      dropoff_location,
      trip_date,
      trip_time,
      price,
      price_type,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error || !trip) throw new Error(error?.message || 'Failed to create trip')

  // Handle passengers JSON
  const passengersJson = formData.get('passengers_json') as string
  if (passengersJson) {
    try {
      const passengers: Array<{ name: string; nationality: string; id_number: string }> = JSON.parse(passengersJson)
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i]
        if (!p.name) continue
        const { data: pRecord } = await admin.from('passengers').insert({
          full_name: p.name,
          nationality: p.nationality || 'Unknown',
          passport_number: p.id_number || null,
        }).select().single()
        if (pRecord) {
          await admin.from('trip_passengers').insert({
            trip_id: trip.id,
            passenger_id: pRecord.id,
            seq_number: i + 1,
          })
        }
      }
    } catch (e) {
      console.error('Failed to parse passengers', e)
    }
  }

  revalidatePath('/admin/trips')
  if (booking_id) revalidatePath(`/admin/bookings/${booking_id}`)
  redirect(`/admin/trips/${trip.id}`)
}

export async function updateAdminTrip(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const status = formData.get('status') as 'scheduled' | 'completed' | 'cancelled'
  const pickup_location = formData.get('pickup_location') as string
  const dropoff_location = formData.get('dropoff_location') as string
  const trip_date = formData.get('trip_date') as string
  const trip_time = formData.get('trip_time') as string
  const price = parseFloat(formData.get('price') as string || '0')
  const price_type = formData.get('price_type') as 'cash' | 'deferred'
  const driver_id = formData.get('driver_id') as string
  const vehicle_id = formData.get('vehicle_id') as string

  const { error } = await supabase.from('trips').update({
    pickup_location,
    dropoff_location,
    trip_date,
    trip_time,
    price,
    price_type,
    driver_id,
    vehicle_id,
    status,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/trips')
  revalidatePath(`/admin/trips/${id}`)
  redirect(`/admin/trips/${id}`)
}

export async function deleteAdminTrip(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/trips')
  redirect('/admin/trips')
}

export async function duplicateTrip(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const id = formData.get('id') as string

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (!trip) throw new Error('Trip not found')

  // Get passengers of original trip
  const { data: origPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(id, full_name, nationality, passport_number)')
    .eq('trip_id', id)
    .order('seq_number', { ascending: true })

  // Create new trip (same data, new date = tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: newTrip, error } = await supabase
    .from('trips')
    .insert({
      driver_id: trip.driver_id,
      vehicle_id: trip.vehicle_id,
      booking_id: trip.booking_id,
      pickup_location: trip.pickup_location,
      dropoff_location: trip.dropoff_location,
      trip_date: tomorrow.toISOString().split('T')[0],
      trip_time: trip.trip_time,
      price: trip.price,
      price_type: trip.price_type,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error || !newTrip) throw new Error(error?.message || 'Duplicate failed')

  // Copy passengers
  for (const tp of origPassengers || []) {
    const p = (tp as any).passengers
    if (p) {
      await admin.from('trip_passengers').insert({
        trip_id: newTrip.id,
        passenger_id: p.id,
        seq_number: tp.seq_number,
      })
    }
  }

  revalidatePath('/admin/trips')
  redirect(`/admin/trips/${newTrip.id}`)
}
