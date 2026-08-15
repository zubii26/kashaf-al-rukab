'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logPerf, startTimer } from '@/lib/utils/perf-logger'

type LoginState = { error: string } | null

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const totalEnd = startTimer()
  const supabase = await createClient()

  const identifier = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  let email = identifier

  // If the identifier doesn't look like an email, treat it as a driver name
  if (!identifier.includes('@')) {
    const adminClient = createAdminClient()

    const { data: drivers, error: driverError } = await adminClient
      .from('drivers')
      .select('login_email')
      .filter('full_name', 'ilike', identifier)

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
      return { error: 'بيانات هذا الحساب غير مكتملة. تواصل مع الإدارة.' }
    }

    email = loginEmail
  }

  const signInEnd = startTimer()
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
  logPerf('login.signInWithPassword', signInEnd())

  if (error) {
    const msg =
      error.message === 'Invalid login credentials'
        ? 'كلمة المرور غير صحيحة.'
        : error.message
    return { error: msg }
  }

  // The hook injects user_role into JWT claims, not the user DB record.
  // Try the session's decoded user first (reflects JWT claims),
  // then fall back to the user object's app_metadata.
  const role = authData.session?.user?.app_metadata?.user_role
    ?? authData.user.app_metadata?.user_role

  // Fallback: if role is still not in JWT (e.g., first login after hook was enabled),
  // do one profiles query and redirect based on that
  let finalRole = role
  if (!finalRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    finalRole = profile?.role
  }

  revalidatePath('/', 'layout')

  logPerf('login.total', totalEnd())

  if (finalRole === 'driver') {
    redirect('/driver/trips/new')
  }

  redirect('/admin/dashboard')
}
