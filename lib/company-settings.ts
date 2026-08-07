import { createAdminClient } from '@/lib/supabase/admin'

/** DB row shape (snake_case) */
export interface CompanySettings {
  id: string
  name_ar: string
  name_en: string
  license_number: string
  cr_number: string
  contact_phone: string
  logo_url: string | null
  stamp_url: string | null
  updated_at: string
  // camelCase aliases for backwards-compat with existing print pages
  nameAr: string
  nameEn: string
  licenseNumber: string
  crNumber: string
  contactPhone: string
}

const DEFAULT_SETTINGS: CompanySettings = {
  id: 'default',
  name_ar: 'كشاف الركاب للنقل',
  name_en: 'Kashaf Al Rukab Transport',
  license_number: '',
  cr_number: '',
  contact_phone: '',
  logo_url: null,
  stamp_url: null,
  updated_at: new Date().toISOString(),
  // aliases
  nameAr: 'كشاف الركاب للنقل',
  nameEn: 'Kashaf Al Rukab Transport',
  licenseNumber: '',
  crNumber: '',
  contactPhone: '',
}

function addAliases(data: Omit<CompanySettings, 'nameAr' | 'nameEn' | 'licenseNumber' | 'crNumber' | 'contactPhone'>): CompanySettings {
  return {
    ...data,
    nameAr: data.name_ar,
    nameEn: data.name_en,
    licenseNumber: data.license_number,
    crNumber: data.cr_number,
    contactPhone: data.contact_phone,
  }
}

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('company_settings')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error || !data) {
      return DEFAULT_SETTINGS
    }
    return addAliases(data as Omit<CompanySettings, 'nameAr' | 'nameEn' | 'licenseNumber' | 'crNumber' | 'contactPhone'>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Returns a public URL for a file in Supabase Storage.
 * If logo_url starts with 'http' it's already a full URL.
 * Otherwise treat it as a path in the 'company-assets' bucket.
 */
export function getAssetUrl(path: string | null, supabaseUrl: string): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${supabaseUrl}/storage/v1/object/public/company-assets/${path}`
}
