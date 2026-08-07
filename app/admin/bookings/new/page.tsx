import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBooking } from '../actions'
import Link from 'next/link'

export default async function NewBookingPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">New Booking</h1>
        <Card>
          <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
          <CardContent>
            <form action={createBooking} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Client</label>
                <select
                  name="client_id"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a client...</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary">
                  No client? <Link href="/admin/clients/new" className="text-primary hover:underline">Add one first →</Link>
                </p>
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <Link href="/admin/bookings"><SecondaryButton type="button">Cancel</SecondaryButton></Link>
                <PrimaryButton type="submit">Create Booking</PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
