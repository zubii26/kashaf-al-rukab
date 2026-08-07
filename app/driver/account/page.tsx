import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserSquare2, Car, Phone, Globe } from 'lucide-react'

export default async function DriverAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: driver } = await supabase
    .from('drivers')
    .select('*, vehicles(plate_number, vehicle_type, registration_number, registration_expiry)')
    .eq('auth_user_id', user.id)
    .single()

  if (!driver) {
    return (
      <PageLayout>
        <div className="text-center py-10 text-text-secondary">Driver profile not found.</div>
      </PageLayout>
    )
  }

  const vehicle = (driver as any).vehicles

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">My Account</h1>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserSquare2 size={20} /> Driver Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5 mb-6">
              {driver.photo_url ? (
                <img src={driver.photo_url} alt={driver.full_name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                  {driver.full_name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-text-primary">{driver.full_name}</h2>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {driver.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Nationality</p>
                <p className="font-medium text-text-primary flex items-center gap-2"><Globe size={14} />{driver.nationality}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Mobile</p>
                <p className="font-medium text-text-primary flex items-center gap-2"><Phone size={14} />{driver.mobile_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Iqama / Residence Number</p>
                <p className="font-medium text-text-primary">{driver.residence_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase tracking-wide">Rukab Card Number</p>
                <p className="font-medium text-text-primary">{driver.card_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Vehicle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car size={20} /> Assigned Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {!vehicle ? (
              <p className="text-text-secondary text-sm">No vehicle assigned. Contact your admin.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-text-secondary text-xs uppercase tracking-wide">Plate Number</p>
                  <p className="font-bold text-text-primary text-lg">{vehicle.plate_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-text-secondary text-xs uppercase tracking-wide">Vehicle Type</p>
                  <p className="font-medium text-text-primary">{vehicle.vehicle_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-text-secondary text-xs uppercase tracking-wide">Registration Number</p>
                  <p className="font-medium text-text-primary">{vehicle.registration_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-text-secondary text-xs uppercase tracking-wide">Registration Expiry</p>
                  <p className={`font-medium ${new Date(vehicle.registration_expiry) < new Date() ? 'text-red-500' : 'text-text-primary'}`}>
                    {new Date(vehicle.registration_expiry).toLocaleDateString()}
                    {new Date(vehicle.registration_expiry) < new Date() && ' ⚠️ EXPIRED'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}