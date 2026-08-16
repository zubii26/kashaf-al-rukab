import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { createDriver } from '../actions'

export default async function NewDriverPage() {
  const supabase = await createClient()
  
  // Fetch vehicles for the dropdown
  const { data: vehicles } = await supabase.from('vehicles').select('id, plate_number, vehicle_type').order('plate_number')

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Add Driver</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Driver Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDriver} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Login Password</label>
                  <input
                    name="password"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Full Name</label>
                <input
                  name="full_name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Nationality <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input
                    name="nationality"
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Mobile Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input
                    name="mobile_number"
                    type="tel"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Residence Number <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input
                    name="residence_number"
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Card Number (Rukab) <span className="text-xs text-text-secondary font-normal">(optional)</span></label>
                  <input
                    name="card_number"
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium text-text-primary">Vehicle Assignment (Optional)</h3>
                <div className="bg-primary/5 p-4 rounded-md space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">New Vehicle Plate</label>
                      <input
                        name="new_vehicle_plate"
                        type="text"
                        placeholder="Leave blank to skip"
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">New Vehicle Type</label>
                      <input
                        name="new_vehicle_type"
                        type="text"
                        placeholder="e.g. Sedan, SUV, Bus..."
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Registration Number</label>
                      <input
                        name="new_vehicle_registration"
                        type="text"
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Registration Expiry</label>
                      <input
                        name="new_vehicle_expiry"
                        type="date"
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Driver Photo</label>
                <input
                  name="photo_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Link href="/admin/drivers">
                  <SecondaryButton type="button">Cancel</SecondaryButton>
                </Link>
                <PrimaryButton type="submit">Create Driver</PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
