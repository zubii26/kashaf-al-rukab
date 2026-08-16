import Link from 'next/link'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteVehicle } from './actions'
import { SearchInput } from '@/components/admin/SearchInput'

// Always render fresh — admin list pages must use service role to bypass RLS.
export const dynamic = 'force-dynamic'

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = createAdminClient()
  const resolvedParams = await searchParams
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : ''

  let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false })

  if (q) {
    query = query.or(`plate_number.ilike.%${q}%,vehicle_type.ilike.%${q}%,registration_number.ilike.%${q}%`)
  }

  const { data: vehicles } = await query
  const { count: totalCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Vehicles</h1>
        <Link href="/admin/vehicles/new">
          <PrimaryButton>Add Vehicle</PrimaryButton>
        </Link>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Suspense fallback={<div className="h-10 w-full max-w-md bg-border/30 rounded-md" />}>
          <SearchInput placeholder="Search by plate, type, or registration..." />
        </Suspense>
        <div className="text-sm text-text-secondary">
          Showing {vehicles?.length || 0} of {totalCount || 0} vehicles
        </div>
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
