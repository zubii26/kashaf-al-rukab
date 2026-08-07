import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function DriversPage() {
  const supabase = await createClient()
  
  // We want to fetch drivers and their assigned vehicles
  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      *,
      vehicles (
        plate_number
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Drivers</h1>
        <Link href="/admin/drivers/new">
          <PrimaryButton>Add Driver</PrimaryButton>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-text-secondary text-sm">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Mobile</th>
                  <th className="p-4 font-medium">Vehicle</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary">
                      No drivers found.
                    </td>
                  </tr>
                ) : null}
                {drivers?.map((driver: any) => (
                  <tr key={driver.id} className="border-b border-border last:border-0 text-text-primary">
                    <td className="p-4 font-medium">{driver.full_name}</td>
                    <td className="p-4">{driver.mobile_number}</td>
                    <td className="p-4">{driver.vehicles?.plate_number || 'Unassigned'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        driver.status === 'active' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link href={`/admin/drivers/${driver.id}`}>
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
