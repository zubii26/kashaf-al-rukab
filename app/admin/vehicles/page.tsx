import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteVehicle } from './actions'

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: vehicles } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Vehicles</h1>
        <Link href="/admin/vehicles/new">
          <PrimaryButton>Add Vehicle</PrimaryButton>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-text-secondary text-sm">
                  <th className="p-4 font-medium">Plate Number</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Registration</th>
                  <th className="p-4 font-medium">Expiry</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary">
                      No vehicles found.
                    </td>
                  </tr>
                ) : null}
                {vehicles?.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border last:border-0 text-text-primary">
                    <td className="p-4">{vehicle.plate_number}</td>
                    <td className="p-4 capitalize">{vehicle.vehicle_type}</td>
                    <td className="p-4">{vehicle.registration_number}</td>
                    <td className="p-4">{new Date(vehicle.registration_expiry).toLocaleDateString()}</td>
                    <td className="p-4 text-right space-x-2">
                      <Link href={`/admin/vehicles/${vehicle.id}`}>
                        <PrimaryButton className="px-3 py-1 text-xs">Edit</PrimaryButton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
