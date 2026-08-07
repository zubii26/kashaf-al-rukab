import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { saveContract } from '../actions'
import Link from 'next/link'

const DEFAULT_CANCELLATION = `في حال الغاء التعاقد لاي سبب شخصي او اسباب اخرى تتعلق في الحجوزات او الانظمه تكون سياسة الالغاء والاستبدال حسب نظام وزارة التجارة السعودي في حالة الحجز وتم الالغاء قبل موعد الرحلة باكثر من 24 ساعة يتم استرداد المبلغ كامل.`

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, clients(name)')
    .eq('id', bookingId)
    .single()

  if (!booking) notFound()

  // Fetch contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()

  // Fetch linked trips
  const { data: trips } = await supabase
    .from('trips')
    .select('*, drivers(full_name), vehicles(plate_number)')
    .eq('booking_id', bookingId)
    .order('trip_date', { ascending: true })

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/bookings" className="text-text-secondary hover:text-primary text-sm">← Bookings</Link>
            <h1 className="text-3xl font-bold text-text-primary mt-1">
              Booking #{booking.booking_number}
            </h1>
            <p className="text-text-secondary text-sm mt-1">Client: <span className="font-medium text-text-primary">{(booking as any).clients?.name}</span></p>
          </div>
          <Link href={`/admin/trips/new?bookingId=${bookingId}`}>
            <PrimaryButton>+ Add Trip</PrimaryButton>
          </Link>
        </div>

        {/* Contract Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transport Contract (عقد النقل)</CardTitle>
            {contract && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Contract exists</span>
            )}
          </CardHeader>
          <CardContent>
            <form action={saveContract} className="space-y-4">
              <input type="hidden" name="id" value={contract?.id ?? 'new'} />
              <input type="hidden" name="booking_id" value={bookingId} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Party Two Name (الطرف الثاني)</label>
                  <input name="party_two_name" type="text" required defaultValue={contract?.party_two_name ?? (booking as any).clients?.name ?? ''}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Contract Date</label>
                  <input name="contract_date" type="date" required
                    defaultValue={contract?.contract_date ?? new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Route From</label>
                  <input name="route_from" type="text" required defaultValue={contract?.route_from ?? ''}
                    placeholder="e.g. MAKKAH HOTEL"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Route To</label>
                  <input name="route_to" type="text" required defaultValue={contract?.route_to ?? ''}
                    placeholder="e.g. JEDDAH AIRPORT"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Price (SAR)</label>
                  <input name="price" type="number" required min="0" step="0.01"
                    defaultValue={contract ? Number(contract.price) : ''}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Price Type</label>
                  <select name="price_type" defaultValue={contract?.price_type ?? 'cash'}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="cash">Cash (نقداً)</option>
                    <option value="deferred">Deferred (آجلاً)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Trip Duration</label>
                  <input name="trip_duration" type="text" defaultValue={contract?.trip_duration ?? ''}
                    placeholder="e.g. 3 days"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Cancellation Policy (سياسة الإلغاء)</label>
                <textarea name="cancellation_policy_text" rows={3}
                  defaultValue={contract?.cancellation_policy_text ?? DEFAULT_CANCELLATION}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-3">
                  {contract && (
                    <Link
                      href={`/driver/trips/${trips?.[0]?.id}/print-contract`}
                      target="_blank"
                      className="px-4 py-2 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-surface transition-colors"
                    >
                      🖨 Print Contract
                    </Link>
                  )}
                </div>
                <PrimaryButton type="submit">
                  {contract ? 'Update Contract' : 'Create Contract'}
                </PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trips Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Linked Trips</CardTitle>
            <Link href={`/admin/trips/new?bookingId=${bookingId}`}>
              <PrimaryButton className="px-3 py-1 text-xs">+ Add Trip</PrimaryButton>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!trips || trips.length === 0 ? (
              <div className="p-6 text-center text-text-secondary text-sm">
                No trips linked to this booking yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-text-secondary text-sm">
                    <th className="p-4 font-medium">Trip #</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Route</th>
                    <th className="p-4 font-medium">Driver</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip: any) => (
                    <tr key={trip.id} className="border-b border-border last:border-0 text-text-primary">
                      <td className="p-4 font-bold text-primary">#{trip.trip_number}</td>
                      <td className="p-4 text-sm">{new Date(trip.trip_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">{trip.pickup_location} → {trip.dropoff_location}</td>
                      <td className="p-4 text-sm">{trip.drivers?.full_name ?? '—'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                          trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{trip.status}</span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link href={`/admin/trips/${trip.id}`}>
                          <PrimaryButton className="px-3 py-1 text-xs">Edit</PrimaryButton>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}