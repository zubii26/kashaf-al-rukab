import Link from 'next/link'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SearchInput } from '@/components/admin/SearchInput'

// Always render fresh — never serve from Next.js Full Route Cache.
// Admin list pages must bypass RLS entirely using the service role key.
export const dynamic = 'force-dynamic'

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // createAdminClient uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS completely.
  // Using the session-based anon client here caused RLS to intermittently fall
  // back to driver_read_self, returning only 1 driver when is_admin() failed.
  const supabase = createAdminClient()
  const resolvedParams = await searchParams
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : ''
  
  // Base query
  let query = supabase
    .from('drivers')
    .select(`
      *,
      vehicles (
        plate_number
      )
    `)
    .order('created_at', { ascending: false })

  // Apply search filter if query exists
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,mobile_number.ilike.%${q}%,card_number.ilike.%${q}%,nationality.ilike.%${q}%`)
  }

  const { data: drivers } = await query

  // We need to count total drivers to show X of Y if we want, but let's just show filtered count
  const { count: totalCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true })

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Drivers</h1>
        <Link href="/admin/drivers/new">
          <PrimaryButton>Add Driver</PrimaryButton>
        </Link>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Suspense fallback={<div className="h-10 w-full max-w-md bg-border/30 rounded-md" />}>
          <SearchInput placeholder="Search by name, mobile, nationality..." />
        </Suspense>
        <div className="text-sm text-text-secondary">
          Showing {drivers?.length || 0} of {totalCount || 0} drivers
        </div>
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
