'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createDriver(formData: FormData) {
  const adminClient = createAdminClient()
  const supabase = await createClient() // For non-auth DB operations

  const password = formData.get('password') as string
  
  const full_name = formData.get('full_name') as string
  const nationality = formData.get('nationality') as string
  const mobile_number = formData.get('mobile_number') as string
  const residence_number = formData.get('residence_number') as string
  const card_number = formData.get('card_number') as string
  const vehicle_id = formData.get('vehicle_id') as string | null
  const new_vehicle_plate = formData.get('new_vehicle_plate') as string | null
  const new_vehicle_type = formData.get('new_vehicle_type') as string | null
  const new_vehicle_registration = formData.get('new_vehicle_registration') as string | null
  const new_vehicle_expiry = formData.get('new_vehicle_expiry') as string | null
  const photo_file = formData.get('photo_file') as File | null

  // Auto-generate a unique internal email from the driver's name.
  // Drivers log in with their name + password, so email is just an
  // internal Supabase Auth identifier — never shown to the driver.
  // A random suffix ensures uniqueness even if two drivers share a name.
  const nameSlug = full_name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '') // strip non-ASCII (Arabic, etc.)
    .slice(0, 30) || 'driver'
  const uniqueSuffix = Math.random().toString(36).slice(2, 8)
  const email = `${nameSlug}-${uniqueSuffix}@drivers.internal`

  // 1. Create Auth User
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create auth user')
  }

  const userId = authData.user.id

  // 2. Upload Photo (if provided)
  let photo_url: string | null = null
  if (photo_file && photo_file.size > 0) {
    const fileExt = photo_file.name.split('.').pop()
    const fileName = `${userId}-${Math.random()}.${fileExt}`
    const filePath = `drivers/${fileName}`

    const { error: uploadError, data } = await adminClient.storage
      .from('secure_uploads')
      .upload(filePath, photo_file)

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      // Continue anyway, but without a photo
    } else {
      photo_url = data?.path || null
    }
  }

  // 3. Create Profile
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: userId,
    role: 'driver',
    full_name,
  })

  if (profileError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(userId)
    throw new Error('Failed to create driver profile: ' + profileError.message)
  }

  // 4. Create Vehicle (if new vehicle details provided)
  let final_vehicle_id = vehicle_id
  if (!final_vehicle_id && new_vehicle_plate && new_vehicle_type && new_vehicle_registration && new_vehicle_expiry) {
    const { data: vehicle, error: vehicleError } = await adminClient.from('vehicles').insert({
      plate_number: new_vehicle_plate,
      vehicle_type: new_vehicle_type,
      registration_number: new_vehicle_registration,
      registration_expiry: new_vehicle_expiry
    }).select().single()

    if (vehicleError) {
      await adminClient.auth.admin.deleteUser(userId)
      throw new Error('Failed to create new vehicle: ' + vehicleError.message)
    }
    
    if (vehicle) {
      final_vehicle_id = vehicle.id
    }
  }

  // 5. Create Driver Record
  // login_email is denormalized here so driver-login can resolve name → email
  // in a single DB query without a separate auth.admin.getUserById() call.
  const { error: driverError } = await adminClient.from('drivers').insert({
    auth_user_id: userId,
    full_name,
    login_email: email,
    nationality,
    mobile_number,
    residence_number,
    card_number,
    photo_url,
    vehicle_id: final_vehicle_id || null,
    status: 'active'
  })

  if (driverError) {
    // Rollback
    await adminClient.auth.admin.deleteUser(userId)
    throw new Error('Failed to create driver record: ' + driverError.message)
  }

  revalidatePath('/admin/drivers')
  redirect('/admin/drivers')
}

export async function updateDriver(formData: FormData) {
  const adminClient = createAdminClient()
  
  const id = formData.get('id') as string
  const full_name = formData.get('full_name') as string
  const nationality = formData.get('nationality') as string
  const mobile_number = formData.get('mobile_number') as string
  const residence_number = formData.get('residence_number') as string
  const card_number = formData.get('card_number') as string
  const vehicle_id = formData.get('vehicle_id') as string | null
  const status = formData.get('status') as 'active' | 'suspended'

  const { error } = await adminClient
    .from('drivers')
    .update({
      full_name,
      nationality,
      mobile_number,
      residence_number,
      card_number,
      vehicle_id: vehicle_id || null,
      status
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Update profile name as well to keep in sync
  // First we need the auth_user_id
  const { data: driver } = await adminClient.from('drivers').select('auth_user_id').eq('id', id).single()
  if (driver?.auth_user_id) {
    await adminClient.from('profiles').update({ full_name }).eq('id', driver.auth_user_id)
  }

  revalidatePath('/admin/drivers')
  redirect('/admin/drivers')
}

export async function deleteDriver(id: string) {
  const adminClient = createAdminClient()
  
  // Get the auth_user_id first
  const { data: driver } = await adminClient.from('drivers').select('auth_user_id').eq('id', id).single()
  
  if (driver?.auth_user_id) {
    // Deleting the auth user cascades to profiles and drivers because of ON DELETE CASCADE
    const { error } = await adminClient.auth.admin.deleteUser(driver.auth_user_id)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/drivers')
  return { success: true }
}



