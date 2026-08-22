import { notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { updateDriver } from '../actions'
import DeleteDriverButton from '@/components/admin/DeleteDriverButton'
import EditDriverForm from './EditDriverForm'

export default async function EditDriverPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params
  const supabase = await createClient()
  
  const { data: driver } = await supabase.from('drivers').select('*').eq('id', driverId).single()
  if (!driver) notFound()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, vehicle_type')
    .order('plate_number')

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Edit Driver</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Driver Details</CardTitle>
          </CardHeader>
          <CardContent>
            <EditDriverForm driver={driver} vehicles={vehicles} />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger flex items-center gap-2">
              <AlertTriangle size={18} />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-text-primary">Delete this driver&apos;s account permanently.</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  This removes their profile and login access. This action cannot be undone.
                </p>
              </div>
              <div className="shrink-0">
                <DeleteDriverButton driverId={driver.id} driverName={driver.full_name} />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageLayout>
  )
}