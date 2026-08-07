import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { saveVehicle } from '../actions'
import Link from 'next/link'

export default async function VehicleFormPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params
  const isNew = vehicleId === 'new'
  const supabase = await createClient()
  
  let vehicle: any = null
  if (!isNew) {
    const { data } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single()
    if (!data) notFound()
    vehicle = data
  }

  // Fetch all drivers to show in assignment dropdown
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name, vehicle_id')
    .order('full_name')

  // Find which driver is currently assigned to this vehicle
  const assignedDriver = drivers?.find(d => d.vehicle_id === vehicleId)

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">
            {isNew ? 'Add Vehicle' : 'Edit Vehicle'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveVehicle} className="space-y-4">
              <input type="hidden" name="id" value={isNew ? 'new' : vehicle?.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Plate Number</label>
                  <input
                    name="plate_number"
                    type="text"
                    required
                    defaultValue={vehicle?.plate_number}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Vehicle Type</label>
                  <input
                    name="vehicle_type"
                    type="text"
                    required
                    defaultValue={vehicle?.vehicle_type}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Registration Number</label>
                  <input
                    name="registration_number"
                    type="text"
                    required
                    defaultValue={vehicle?.registration_number}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Registration Expiry</label>
                  <input
                    name="registration_expiry"
                    type="date"
                    required
                    defaultValue={vehicle?.registration_expiry ? new Date(vehicle.registration_expiry).toISOString().split('T')[0] : ''}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Driver Assignment */}
              {!isNew && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Assigned Driver</label>
                  <select
                    name="assigned_driver_id"
                    defaultValue={assignedDriver?.id ?? ''}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— No driver assigned —</option>
                    {drivers?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}{d.vehicle_id && d.vehicle_id !== vehicleId ? ' (assigned to another vehicle)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary">Changing this will update the driver's vehicle assignment.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-2">
                <Link href="/admin/vehicles">
                  <SecondaryButton type="button">Cancel</SecondaryButton>
                </Link>
                <PrimaryButton type="submit">
                  {isNew ? 'Add Vehicle' : 'Save Changes'}
                </PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}