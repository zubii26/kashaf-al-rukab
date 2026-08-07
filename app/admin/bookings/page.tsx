import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      clients(name),
      trips(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Bookings</h1>
        <Link href="/admin/bookings/new">
          <PrimaryButton>New Booking</PrimaryButton>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-text-secondary text-sm">
                  <th className="p-4 font-medium">Booking #</th>
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Trips</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!bookings || bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary">
                      No bookings found. <Link href="/admin/bookings/new" className="text-primary hover:underline">Create the first one →</Link>
                    </td>
                  </tr>
                ) : null}
                {bookings?.map((b: any) => (
                  <tr key={b.id} className="border-b border-border last:border-0 text-text-primary hover:bg-surface/50">
                    <td className="p-4 font-bold text-primary">#{b.booking_number}</td>
                    <td className="p-4 font-medium">{b.clients?.name ?? <span className="text-text-secondary italic">—</span>}</td>
                    <td className="p-4">{b.trips?.[0]?.count ?? 0} trips</td>
                    <td className="p-4 text-text-secondary text-sm">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/bookings/${b.id}`}>
                        <PrimaryButton className="px-3 py-1 text-xs">View</PrimaryButton>
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
