'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { revalidatePath } from 'next/cache'

/**
 * Driver self-service profile update.
 * Drivers may only update their own personal fields.
 * Vehicle assignment is handled separately via updateDriverVehicleAction.
 */
export async function updateDriverProfileAction(formData: FormData) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Unauthorized')

  const full_name        = (formData.get('full_name')        as string)?.trim()
  const nationality      = (formData.get('nationality')       as string)?.trim()
  const mobile_number    = (formData.get('mobile_number')    as string)?.trim()
  const residence_number = (formData.get('residence_number') as string)?.trim()
  const card_number      = (formData.get('card_number')      as string)?.trim()
  const photo_file       = formData.get('photo_file') as File | null

  if (!full_name) throw new Error('Name is required')

  // Scope the update to the driver row that belongs to THIS user only.
  // Uses admin client because the drivers RLS only allows SELECT for drivers.
  const adminClient = createAdminClient()

  const { data: existingDriver } = await adminClient
    .from('drivers')
    .select('photo_url')
    .eq('auth_user_id', user.id)
    .single()

  let new_photo_url: string | undefined = undefined

  if (photo_file && photo_file.size > 0) {
    const fileExt = photo_file.name.split('.').pop()
    const fileName = `${user.id}-${Math.random()}.${fileExt}`
    const filePath = `drivers/${fileName}`

    const { error: uploadError, data } = await adminClient.storage
      .from('secure_uploads')
      .upload(filePath, photo_file)

    if (!uploadError && data) {
      const { data: publicUrlData } = adminClient.storage.from('secure_uploads').getPublicUrl(data.path)
      new_photo_url = publicUrlData.publicUrl

      // Delete the old photo if it exists
      if (existingDriver?.photo_url) {
        try {
          const urlParts = existingDriver.photo_url.split('/secure_uploads/')
          if (urlParts.length === 2) {
            const oldPath = urlParts[1]
            await adminClient.storage.from('secure_uploads').remove([oldPath])
          }
        } catch (e) {
          console.error('Failed to delete old photo:', e)
        }
      }
    }
  }

  const updatePayload: any = { 
    full_name, 
    nationality, 
    mobile_number, 
    residence_number, 
    card_number 
  }
  
  if (new_photo_url !== undefined) {
    updatePayload.photo_url = new_photo_url
  }

  const { error } = await adminClient
    .from('drivers')
    .update(updatePayload)
    .eq('auth_user_id', user.id)

  if (error) throw new Error(error.message)

  // Keep profiles table in sync (display name shown in nav etc.)
  await adminClient.from('profiles').update({ full_name }).eq('id', user.id)

  revalidatePath('/driver/account')
}

/**
 * Driver self-service vehicle assignment.
 * The driver types their plate number + vehicle type.
 * - If a vehicle with that plate number already exists, it is reused.
 * - If not, a new vehicle row is created (registration fields default to placeholders
 *   that an admin can fill in later).
 * - If another driver already has that vehicle, they are unassigned first.
 * - Passing an empty plate number unassigns the current vehicle.
 */
export async function updateDriverVehicleAction(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Unauthorized')

  const plate_number   = (formData.get('plate_number')  as string)?.trim().toUpperCase()
  const vehicle_type   = (formData.get('vehicle_type')  as string)?.trim()
  const adminClient    = createAdminClient()

  // Get this driver's internal id
  const { data: self, error: selfErr } = await adminClient
    .from('drivers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (selfErr || !self) throw new Error('Driver record not found')

  // ── Unassign (empty plate = remove vehicle) ──────────────────────────────
  if (!plate_number) {
    await adminClient.from('drivers').update({ vehicle_id: null }).eq('id', self.id)
    revalidatePath('/driver/account')
    return
  }

  if (!vehicle_type) throw new Error('Vehicle type is required')

  // ── Look up existing vehicle by plate number ─────────────────────────────
  let { data: vehicle } = await adminClient
    .from('vehicles')
    .select('id')
    .eq('plate_number', plate_number)
    .maybeSingle()

  // ── Create if not found ──────────────────────────────────────────────────
  if (!vehicle) {
    const { data: created, error: createErr } = await adminClient
      .from('vehicles')
      .insert({
        plate_number,
        vehicle_type,
        registration_number: 'PENDING',
        registration_expiry: '2099-01-01', // admin updates this later
      })
      .select('id')
      .single()

    if (createErr || !created) throw new Error(createErr?.message ?? 'Could not create vehicle')
    vehicle = created
  }

  // ── Unassign any other driver who currently has this vehicle ─────────────
  await adminClient
    .from('drivers')
    .update({ vehicle_id: null })
    .eq('vehicle_id', vehicle.id)
    .neq('id', self.id)

  // ── Assign to this driver ────────────────────────────────────────────────
  const { error } = await adminClient
    .from('drivers')
    .update({ vehicle_id: vehicle.id })
    .eq('id', self.id)

  if (error) throw new Error(error.message)

  revalidatePath('/driver/account')
}

