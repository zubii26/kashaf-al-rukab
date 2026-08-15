'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logPerf, startTimer } from '@/lib/utils/perf-logger'

type LoginState = { error: string } | null

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const totalEnd = startTimer()
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const signInEnd = startTimer()
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)
  logPerf('login.signInWithPassword', signInEnd())

  if (error) {
    return { error: error.message }
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
