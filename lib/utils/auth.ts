import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * Get the authenticated user, deduplicated per request via React cache().
 * 
 * Within a single server request, multiple components/actions calling this
 * function will only trigger ONE actual getUser() call to Supabase Auth.
 * Subsequent calls return the cached result.
 * 
 * This works in Server Components, Server Actions, and Route Handlers.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

/**
 * Get the user ID from the proxy-set request header.
 * Falls back to getAuthenticatedUser() if headers aren't available
 * (e.g., in Server Actions that don't go through the proxy).
 */
export async function getUserId(): Promise<string | null> {
  try {
    const hdrs = await headers()
    const headerUserId = hdrs.get('x-user-id')
    if (headerUserId) return headerUserId
  } catch {
    // headers() may throw in some contexts
  }
  const user = await getAuthenticatedUser()
  return user?.id ?? null
}

/**
 * Get the authenticated driver's internal ID and vehicle_id.
 * Uses cached getUser() + a single driver lookup.
 * 
 * Returns { userId, driverId, vehicleId } or null if not authenticated
 * or driver record not found.
 */
export const getAuthenticatedDriver = cache(async () => {
  const user = await getAuthenticatedUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, vehicle_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!driver) return null

  return {
    userId: user.id,
    driverId: driver.id,
    vehicleId: driver.vehicle_id,
  }
})
