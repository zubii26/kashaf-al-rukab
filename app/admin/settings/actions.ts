'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveCompanySettings(formData: FormData) {
  const admin = createAdminClient()

  const name_ar = formData.get('name_ar') as string
  const name_en = formData.get('name_en') as string
  const license_number = formData.get('license_number') as string
  const cr_number = formData.get('cr_number') as string
  const contact_phone = formData.get('contact_phone') as string
  const logo_file = formData.get('logo_file') as File | null
  const stamp_file = formData.get('stamp_file') as File | null

  let logo_url: string | undefined = undefined
  let stamp_url: string | undefined = undefined

  // Upload logo if provided
  if (logo_file && logo_file.size > 0) {
    const ext = logo_file.name.split('.').pop()
    const path = `logo.${ext}`
    const { error } = await admin.storage
      .from('company-assets')
      .upload(path, logo_file, { upsert: true, contentType: logo_file.type })
    if (!error) {
      const { data: urlData } = admin.storage
        .from('company-assets')
        .getPublicUrl(path)
      logo_url = `${urlData.publicUrl}?t=${Date.now()}`
    }
  }

  // Upload stamp if provided
  if (stamp_file && stamp_file.size > 0) {
    const ext = stamp_file.name.split('.').pop()
    const path = `stamp.${ext}`
    const { error } = await admin.storage
      .from('company-assets')
      .upload(path, stamp_file, { upsert: true, contentType: stamp_file.type })
    if (!error) {
      const { data: urlData } = admin.storage
        .from('company-assets')
        .getPublicUrl(path)
      stamp_url = `${urlData.publicUrl}?t=${Date.now()}`
    }
  }

  const payload: Record<string, unknown> = {
    name_ar,
    name_en,
    license_number,
    cr_number,
    contact_phone,
    updated_at: new Date().toISOString(),
  }
  if (logo_url) payload.logo_url = logo_url
  if (stamp_url) payload.stamp_url = stamp_url

  const { error } = await admin
    .from('company_settings')
    .upsert({ id: 'default', ...payload })

  if (error) throw new Error('Failed to save settings: ' + error.message)

  revalidateTag('company-settings')
  revalidatePath('/admin/settings')
  redirect('/admin/settings')
}
