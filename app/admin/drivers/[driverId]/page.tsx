import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { updateDriver } from '../actions'
import Link from 'next/link'

export default async function EditDriverPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params
  const supabase = await createClient()
  
  const { data: driver } = await supabase.from('drivers').select('*').eq('id', driverId).single()
  if (!driver) notFound()

  // Fetch vehicles for the dropdown
  const { data: vehicles } = await supabase.from('vehicles').select('id, plate_number, vehicle_type').order('plate_number')

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
            <form action={updateDriver} className="space-y-4">
              <input type="hidden" name="id" value={driver.id} />
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Full Name</label>
                <input
                  name="full_name"
                  type="text"
                  required
                  defaultValue={driver.full_name}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Nationality</label>
                  <input
                    name="nationality"
                    type="text"
                    required
                    defaultValue={driver.nationality}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Mobile Number</label>
                  <input
                    name="mobile_number"
                    type="tel"
                    required
                    defaultValue={driver.mobile_number}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Residence Number</label>
                  <input
                    name="residence_number"
                    type="text"
                    required
                    defaultValue={driver.residence_number}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Card Number (Rukab)</label>
                  <input
                    name="card_number"
                    type="text"
                    required
                    defaultValue={driver.card_number}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Assign Vehicle</label>
                  <select
                    name="vehicle_id"
                    defaultValue={driver.vehicle_id || ''}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Unassigned</option>
                    {vehicles?.map(v => (
                      <option key={v.id} value={v.id}>{v.plate_number} - {v.vehicle_type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Status</label>
                  <select
                    name="status"
                    defaultValue={driver.status}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Link href="/admin/drivers">
                  <SecondaryButton type="button">Cancel</SecondaryButton>
                </Link>
                <PrimaryButton type="submit">Save Changes</PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}