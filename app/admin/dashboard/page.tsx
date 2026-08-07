import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrimaryButton } from '@/components/ui/button'
import { Car, Users, UserSquare2, Navigation, DollarSign, Calendar, MessageSquare, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { createReminder, markReminderDone } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalDrivers },
    { count: activeDrivers },
    { count: tripsToday },
    { count: totalTrips },
    { count: openQuotes },
    { count: unreadMessages },
    { data: revenueToday },
    { data: totalRevenue },
    { data: upcomingTrips },
    { data: reminders },
  ] = await Promise.all([
    supabase.from('drivers').select('*', { count: 'exact', head: true }),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('trip_date', today),
    supabase.from('trips').select('*', { count: 'exact', head: true }),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).is('read_at', null),
    supabase.from('trips').select('price').eq('trip_date', today),
    supabase.from('trips').select('price'),
    supabase.from('trips')
      .select('*, drivers(full_name), vehicles(plate_number)')
      .gte('trip_date', today)
      .lte('trip_date', sevenDaysLater)
      .eq('status', 'scheduled')
      .order('trip_date', { ascending: true })
      .limit(20),
    supabase.from('reminders').select('*').eq('is_done', false).order('due_date', { ascending: true }).limit(10),
  ])

  const revToday = (revenueToday || []).reduce((s: number, t: any) => s + Number(t.price), 0)
  const revTotal = (totalRevenue || []).reduce((s: number, t: any) => s + Number(t.price), 0)

  const kpis = [
    { label: 'Total Drivers', value: totalDrivers ?? 0, icon: UserSquare2, color: 'text-blue-500', href: '/admin/drivers' },
    { label: 'Active Drivers', value: activeDrivers ?? 0, icon: UserSquare2, color: 'text-green-500', href: '/admin/drivers' },
    { label: 'Trips Today', value: tripsToday ?? 0, icon: Navigation, color: 'text-orange-500', href: '/admin/trips' },
    { label: 'Total Trips', value: totalTrips ?? 0, icon: Navigation, color: 'text-purple-500', href: '/admin/trips' },
    { label: 'Revenue Today', value: `SAR ${revToday.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', href: '/admin/reports' },
    { label: 'Total Revenue', value: `SAR ${revTotal.toLocaleString()}`, icon: DollarSign, color: 'text-teal-500', href: '/admin/reports' },
    { label: 'Open Quotes', value: openQuotes ?? 0, icon: ClipboardList, color: 'text-yellow-500', href: '/admin/quotes' },
    { label: 'Unread Messages', value: unreadMessages ?? 0, icon: MessageSquare, color: 'text-red-500', href: '/admin/messages' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-text-secondary">{kpi.label}</CardTitle>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-text-primary">{kpi.value}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Upcoming Trips */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Calendar size={18} /> Next 7 Days</CardTitle>
              <Link href="/admin/trips" className="text-xs text-primary hover:underline">View all →</Link>
            </CardHeader>
            <CardContent className="p-0">
              {!upcomingTrips || upcomingTrips.length === 0 ? (
                <div className="p-6 text-center text-text-secondary text-sm">No scheduled trips in the next 7 days.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="px-4 py-3 text-left font-medium">Trip #</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Route</th>
                      <th className="px-4 py-3 text-left font-medium">Driver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingTrips.map((t: any) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                        <td className="px-4 py-3 font-bold text-primary">#{t.trip_number}</td>
                        <td className="px-4 py-3">{new Date(t.trip_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs">
                          <div>{t.pickup_location}</div>
                          <div className="text-text-secondary">→ {t.dropoff_location}</div>
                        </td>
                        <td className="px-4 py-3">{t.drivers?.full_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reminders */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add reminder */}
              <form action={createReminder} className="space-y-2">
                <input name="body" type="text" required placeholder="Reminder text..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input name="due_date" type="date"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <PrimaryButton type="submit" className="w-full text-sm py-2">Add Reminder</PrimaryButton>
              </form>

              <div className="space-y-2 mt-4">
                {!reminders || reminders.length === 0 ? (
                  <p className="text-text-secondary text-sm text-center py-2">No pending reminders.</p>
                ) : (
                  reminders.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-2 bg-surface/50 rounded-md p-3 border border-border">
                      <form action={markReminderDone} className="flex-shrink-0 mt-0.5">
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit"
                          className="w-4 h-4 rounded border border-border hover:bg-primary hover:border-primary transition-colors" />
                      </form>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{r.body}</p>
                        {r.due_date && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            Due: {new Date(r.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
