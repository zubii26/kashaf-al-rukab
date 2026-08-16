import { createAdminClient } from '@/lib/supabase/admin'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton } from '@/components/ui/button'
import { saveCompanySettings } from './actions'
import Image from 'next/image'

export default async function SettingsPage() {
  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('company_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Company Settings</h1>
          <p className="text-text-secondary mt-1 text-sm">
            These details appear on all generated PDF documents (contracts, manifests, inspections).
          </p>
        </div>

        <form action={saveCompanySettings} encType="multipart/form-data" className="space-y-6">

          {/* Company Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Company Name (Arabic)</label>
                  <input
                    name="name_ar"
                    type="text"
                    required
                    dir="rtl"
                    defaultValue={settings?.name_ar ?? 'كشاف الركاب للنقل'}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Company Name (English)</label>
                  <input
                    name="name_en"
                    type="text"
                    required
                    defaultValue={settings?.name_en ?? 'Maher Al Safar Transport'}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">License Number</label>
                  <input
                    name="license_number"
                    type="text"
                    defaultValue={settings?.license_number ?? ''}
                    placeholder="e.g. 35/00002393"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">CR Number (السجل التجاري)</label>
                  <input
                    name="cr_number"
                    type="text"
                    defaultValue={settings?.cr_number ?? ''}
                    placeholder="e.g. 7031314748"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Contact Phone</label>
                  <input
                    name="contact_phone"
                    type="tel"
                    defaultValue={settings?.contact_phone ?? ''}
                    placeholder="+966 5X XXX XXXX"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.logo_url && (
                <div className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-border">
                  <div className="relative w-32 h-20 flex items-center justify-center bg-white rounded border">
                    <img
                      src={settings.logo_url}
                      alt="Current Logo"
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Current logo</p>
                    <p className="text-xs text-text-secondary mt-1">Upload a new file below to replace it</p>
                  </div>
                </div>
              )}
              {!settings?.logo_url && (
                <div className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-dashed border-border">
                  <div className="relative w-32 h-20 flex items-center justify-center bg-white rounded border">
                    <img
                      src="/logo.png"
                      alt="Default Logo"
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Default logo (Maher Transport demo)</p>
                    <p className="text-xs text-text-secondary mt-1">Upload your company logo below</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Upload Logo (PNG or JPG)</label>
                <input
                  name="logo_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                <p className="text-xs text-text-secondary">Recommended: PNG with transparent background, min 300×150px</p>
              </div>
            </CardContent>
          </Card>

          {/* Stamp Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Company Stamp / Seal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.stamp_url && (
                <div className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-border">
                  <div className="relative w-24 h-24 flex items-center justify-center bg-white rounded-full border overflow-hidden">
                    <img
                      src={settings.stamp_url}
                      alt="Current Stamp"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Current stamp</p>
                    <p className="text-xs text-text-secondary mt-1">Upload a new file below to replace it</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Upload Stamp (PNG recommended)</label>
                <input
                  name="stamp_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                <p className="text-xs text-text-secondary">Recommended: PNG with transparent background, circular shape, min 300×300px</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <PrimaryButton type="submit" className="px-8">
              Save Settings
            </PrimaryButton>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}
