'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createReminder(formData: FormData) {
  const supabase = await createClient()
  const body = formData.get('body') as string
  const due_date = formData.get('due_date') as string | null

  const { error } = await supabase.from('reminders').insert({
    body,
    due_date: due_date || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/dashboard')
}

export async function markReminderDone(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('reminders').update({ is_done: true }).eq('id', id)
  revalidatePath('/admin/dashboard')
}
