'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  const supabase = await createClient()
  const client_id = formData.get('client_id') as string

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({ client_id })
    .select()
    .single()

  if (error || !booking) throw new Error(error?.message || 'Failed to create booking')

  revalidatePath('/admin/bookings')
  redirect(`/admin/bookings/${booking.id}`)
}

export async function saveContract(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string | null
  const booking_id = formData.get('booking_id') as string
  const party_two_name = formData.get('party_two_name') as string
  const route_from = formData.get('route_from') as string
  const route_to = formData.get('route_to') as string
  const price = parseFloat(formData.get('price') as string)
  const price_type = formData.get('price_type') as 'cash' | 'deferred'
  const trip_duration = formData.get('trip_duration') as string
  const contract_date = formData.get('contract_date') as string
  const cancellation_policy_text = formData.get('cancellation_policy_text') as string

  const payload = {
    booking_id,
    party_two_name,
    route_from,
    route_to,
    price,
    price_type,
    trip_duration,
    contract_date,
    cancellation_policy_text,
  }

  if (id && id !== 'new') {
    const { error } = await supabase.from('contracts').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('contracts').insert(payload)
    if (error) throw new Error(error.message)
  }

  revalidatePath(`/admin/bookings/${booking_id}`)
  redirect(`/admin/bookings/${booking_id}`)
}
