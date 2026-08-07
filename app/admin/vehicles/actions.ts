'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveVehicle(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string | null
  const plate_number = formData.get('plate_number') as string
  const vehicle_type = formData.get('vehicle_type') as string
  const registration_number = formData.get('registration_number') as string
  const registration_expiry = formData.get('registration_expiry') as string
  const assigned_driver_id = formData.get('assigned_driver_id') as string | null

  if (id && id !== 'new') {
    const { error } = await supabase
      .from('vehicles')
      .update({ plate_number, vehicle_type, registration_number, registration_expiry })
      .eq('id', id)

    if (error) throw new Error(error.message)

    // Unassign any driver previously assigned to this vehicle
    await supabase
      .from('drivers')
      .update({ vehicle_id: null })
      .eq('vehicle_id', id)

    // Assign the selected driver to this vehicle
    if (assigned_driver_id) {
      await supabase
        .from('drivers')
        .update({ vehicle_id: id })
        .eq('id', assigned_driver_id)
    }
  } else {
    const { error } = await supabase
      .from('vehicles')
      .insert({ plate_number, vehicle_type, registration_number, registration_expiry })

    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/vehicles')
  revalidatePath('/admin/drivers')
  redirect('/admin/vehicles')
}

export async function deleteVehicle(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/vehicles')
  return { success: true }
}



