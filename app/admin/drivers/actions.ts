'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Shared Types ────────────────────────────────────────────────────────────

type ActionError = { error: string }
type ActionSuccess = { success: true }

// ─── createDriver ────────────────────────────────────────────────────────────

export type CreateDriverState = ActionError | null

export async function createDriver(
  prevState: CreateDriverState,
  formData: FormData
): Promise<CreateDriverState> {
  const adminClient = createAdminClient()

  const password                 = formData.get('password') as string
  const full_name                = (formData.get('full_name') as string)?.trim()
  const nationality              = formData.get('nationality') as string
  const mobile_number            = formData.get('mobile_number') as string
  const residence_number         = formData.get('residence_number') as string
  const card_number              = formData.get('card_number') as string
  const vehicle_id               = formData.get('vehicle_id') as string | null
  const new_vehicle_plate        = (formData.get('new_vehicle_plate') as string | null)?.trim()
  const new_vehicle_type         = formData.get('new_vehicle_type') as string | null
  const new_vehicle_registration = formData.get('new_vehicle_registration') as string | null
  const new_vehicle_expiry       = formData.get('new_vehicle_expiry') as string | null
  const photo_file               = formData.get('photo_file') as File | null

  if (!full_name) return { error: 'Full name is required.' }
  if (!password)  return { error: 'Password is required.' }

  // Pre-check: duplicate driver name (ilike so casing does not matter)
  const { data: existingDrivers } = await adminClient
    .from('drivers')
    .select('id')
    .filter('full_name', 'ilike', full_name)

  if (existingDrivers && existingDrivers.length > 0) {
    return {
      error: `A driver named "${full_name}" already exists. Each driver must have a unique name. Contact the admin to resolve the duplicate.`,
    }
  }

  // Pre-check: duplicate vehicle plate
  if (new_vehicle_plate) {
    const { data: existingVehicle } = await adminClient
      .from('vehicles')
      .select('id')
      .eq('plate_number', new_vehicle_plate)
      .maybeSingle()

    if (existingVehicle) {
      return {
        error: `A vehicle with plate number "${new_vehicle_plate}" already exists. Use the vehicle assignment dropdown to assign the existing vehicle to this driver instead.`,
      }
    }
  }

  // Auto-generate a unique internal email from the driver's name.
  // Drivers log in with their name + password, so email is just an
  // internal Supabase Auth identifier — never shown to the driver.
  const nameSlug = full_name
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
    return { error: authError?.message || 'Failed to create login account. Please try again.' }
  }

  const userId = authData.user.id

  // Helper: rollback auth user on any subsequent failure
  async function rollback() {
    await adminClient.auth.admin.deleteUser(userId)
  }

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
      console.error('Photo upload error (non-fatal):', uploadError)
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
    await rollback()
    return { error: 'Failed to create driver profile. Please try again.' }
  }

  // 4. Create Vehicle (optional — only plate number is required to trigger creation)
  let final_vehicle_id = vehicle_id || null
  if (!final_vehicle_id && new_vehicle_plate) {
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .insert({
        plate_number:        new_vehicle_plate,
        vehicle_type:        new_vehicle_type?.trim()          || '',
        registration_number: new_vehicle_registration?.trim()  || null,
        registration_expiry: new_vehicle_expiry                || null,
      })
      .select()
      .single()

    if (vehicleError) {
      await rollback()
      // Catch any unexpected unique violation at DB level (e.g. race condition)
      if (vehicleError.code === '23505') {
        return {
          error: `A vehicle with plate number "${new_vehicle_plate}" already exists. Use the vehicle assignment dropdown instead.`,
        }
      }
      return { error: `Failed to create vehicle: ${vehicleError.message}` }
    }

    if (vehicle) final_vehicle_id = vehicle.id
  }

  // 5. Create Driver Record
  // login_email is denormalized here so the /login page can resolve name → email
  // in a single DB query without a separate auth.admin.getUserById() call.
  const { error: driverError } = await adminClient.from('drivers').insert({
    auth_user_id:     userId,
    full_name,
    login_email:      email,
    nationality:      nationality      || '',
    mobile_number:    mobile_number    || '',
    residence_number: residence_number || '',
    card_number:      card_number      || '',
    photo_url,
    vehicle_id:       final_vehicle_id,
    status:           'active',
  })

  if (driverError) {
    await rollback()
    if (driverError.code === '23505') {
      return {
        error: `A driver named "${full_name}" already exists. Each driver must have a unique name.`,
      }
    }
    return { error: `Failed to save driver record: ${driverError.message}` }
  }

  revalidatePath('/admin/drivers')
  redirect('/admin/drivers')
}

// ─── updateDriver ─────────────────────────────────────────────────────────────

export async function updateDriver(formData: FormData) {
  const adminClient = createAdminClient()

  const id               = formData.get('id') as string
  const full_name        = formData.get('full_name') as string
  const nationality      = formData.get('nationality') as string
  const mobile_number    = formData.get('mobile_number') as string
  const residence_number = formData.get('residence_number') as string
  const card_number      = formData.get('card_number') as string
  const vehicle_id       = formData.get('vehicle_id') as string | null
  const status           = formData.get('status') as 'active' | 'suspended'

  const { error } = await adminClient
    .from('drivers')
    .update({
      full_name,
      nationality,
      mobile_number,
      residence_number,
      card_number,
      vehicle_id: vehicle_id || null,
      status,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Update profile name as well to keep in sync
  const { data: driver } = await adminClient
    .from('drivers')
    .select('auth_user_id')
    .eq('id', id)
    .single()

  if (driver?.auth_user_id) {
    await adminClient.from('profiles').update({ full_name }).eq('id', driver.auth_user_id)
  }

  revalidatePath('/admin/drivers')
  redirect('/admin/drivers')
}

// ─── deleteDriver ─────────────────────────────────────────────────────────────

export async function deleteDriver(
  id: string
): Promise<ActionError | ActionSuccess> {
  const adminClient = createAdminClient()

  // 1. Fetch auth_user_id + name for the Supabase Auth deletion
  const { data: driver, error: fetchError } = await adminClient
    .from('drivers')
    .select('auth_user_id, full_name')
    .eq('id', id)
    .single()

  if (fetchError || !driver) {
    return { error: 'Driver not found.' }
  }

  // 2. Pre-nullify FK references on trips and vehicle_inspections.
  //    The migration (20260819000000_fix_driver_delete_cascade.sql) changes
  //    these FKs to ON DELETE SET NULL, but we also do it explicitly here
  //    as belt-and-suspenders — ensuring the downstream auth.users → profiles
  //    → drivers cascade is never blocked by a RESTRICT constraint.
  //    Type assertion required: generated types predate the nullable migration
  //    and still declare driver_id as string. The cast sends a real SQL NULL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await adminClient.from('trips').update({ driver_id: null } as any).eq('driver_id', id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await adminClient
    .from('vehicle_inspections')
    .update({ driver_id: null } as any)
    .eq('driver_id', id)

  if (driver.auth_user_id) {
    // 3. Deleting the auth user cascades → profiles → drivers (ON DELETE CASCADE)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      driver.auth_user_id
    )

    if (deleteError) {
      // Auth Admin errors wrap Postgres errors differently from the DB client.
      // Inspect message, code, and status to reliably detect FK violations.
      const rawMsg: string = deleteError.message ?? ''
      const isFK =
        rawMsg.includes('23503') ||
        rawMsg.toLowerCase().includes('foreign key') ||
        (deleteError as unknown as { code?: string }).code === '23503'

      if (isFK) {
        return {
          error: `Cannot delete "${driver.full_name}" — this driver has existing trips or vehicle inspections on record. Suspend the account instead, or delete all associated trips first.`,
        }
      }

      // Safe fallback: never expose raw {} to the UI
      const safeMsg = rawMsg || `status ${(deleteError as unknown as { status?: number }).status ?? 'unknown'}`
      return { error: `Failed to delete driver account: ${safeMsg}` }
    }
  } else {
    // 4. No auth user linked — delete driver row directly
    const { error: directDeleteError } = await adminClient
      .from('drivers')
      .delete()
      .eq('id', id)

    if (directDeleteError) {
      return { error: `Failed to delete driver record: ${directDeleteError.message}` }
    }
  }

  revalidatePath('/admin/drivers')
  return { success: true }
}