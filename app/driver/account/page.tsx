import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserSquare2, Car } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { DriverProfileEditForm } from './DriverProfileEditForm'
import { DriverVehicleEditForm } from './DriverVehicleEditForm'

export default async function DriverAccountPage() {
  const supabase = await createClient()

  const user = await getAuthenticatedUser()
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

        {/* Profile Card — includes inline edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserSquare2 size={20} /> Driver Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <DriverProfileEditForm driver={driver} />
          </CardContent>
        </Card>

        {/* Assigned Vehicle — driver can set plate number + type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car size={20} /> Assigned Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <DriverVehicleEditForm vehicle={vehicle} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}