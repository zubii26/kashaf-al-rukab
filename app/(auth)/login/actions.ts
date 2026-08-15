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

  // Role is now embedded in the JWT via the custom_access_token_hook.
  // No separate profiles query needed — read directly from app_metadata.
  const role = authData.user.app_metadata?.user_role

  revalidatePath('/', 'layout')

  logPerf('login.total', totalEnd())

  if (role === 'driver') {
    redirect('/driver/trips/new')
  }

  redirect('/admin/dashboard')
}
