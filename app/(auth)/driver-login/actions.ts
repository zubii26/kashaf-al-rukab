'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type LoginState = { error: string } | null

export async function driverLogin(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const name = (formData.get('name') as string)?.trim()
  const password = formData.get('password') as string

  if (!name || !password) {
    return { error: 'يرجى إدخال الاسم وكلمة المرور.' }
  }

  // --- Tier 2 optimized: single DB query, no admin API call ---
  //
  // We read login_email directly from the drivers table (denormalized at
  // driver-creation time). This avoids the previous auth.admin.getUserById()
  // round-trip, cutting login from 3 network calls down to 2.
  //
  // The index idx_drivers_lower_full_name on lower(full_name) makes this
  // lookup O(log n) instead of a full table scan.
  const adminClient = createAdminClient()

  const { data: drivers, error: driverError } = await adminClient
    .from('drivers')
    .select('login_email')
    .filter('full_name', 'ilike', name)

  if (driverError) {
    return { error: 'حدث خطأ أثناء البحث. حاول مرة أخرى.' }
  }

  if (!drivers || drivers.length === 0) {
    return { error: 'الاسم غير صحيح أو غير مسجّل كسائق.' }
  }

  if (drivers.length > 1) {
    return { error: 'يوجد أكثر من سائق بهذا الاسم. تواصل مع الإدارة.' }
  }

  const loginEmail = drivers[0].login_email
  if (!loginEmail) {
    // Fallback: login_email not yet backfilled for this driver (pre-migration record)
    return { error: 'بيانات هذا الحساب غير مكتملة. تواصل مع الإدارة.' }
  }

  // Sign in with the resolved email + the provided password (1 Supabase Auth call)
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  })

  if (signInError) {
    const msg =
      signInError.message === 'Invalid login credentials'
        ? 'كلمة المرور غير صحيحة.'
        : signInError.message
    return { error: msg }
  }

  revalidatePath('/', 'layout')
  redirect('/driver/trips/new')
}
