import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PassengerList from './passenger-list'
import DeleteTripButton from './delete-trip-button'
import { getAuthenticatedDriver } from '@/lib/utils/auth'

export default async function DriverTripsPage() {
  const supabase = await createClient()

  // Use cached auth — deduplicates getUser() across proxy + this component
  const driverAuth = await getAuthenticatedDriver()
  if (!driverAuth) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">All Bookings</h1>
        <div className="p-4 bg-red-50 text-red-600 rounded-md">Driver profile not found.</div>
      </div>
    )
  }

  const driver = { id: driverAuth.driverId }

  // 3. Fetch trips (with driver + vehicle — these joins work fine)
  const { data: trips } = await supabase
    .from('trips')
    .select(`*, drivers(full_name), vehicles(vehicle_type)`)
    .eq('driver_id', driver.id)
    .order('created_at', { ascending: false })

  // 4. TWO-STEP: Fetch all passengers for these trips separately (avoids nested RLS bug)
  const tripIds = (trips || []).map((t) => t.id)
  let passengersByTripId: Record<string, { id: string, full_name: string, nationality: string, passport_number: string | null, seq_number: number }[]> = {}

  if (tripIds.length > 0) {
    const { data: allTripPassengers } = await supabase
      .from('trip_passengers')
      .select('trip_id, seq_number, passengers(id, full_name, nationality, passport_number)')
      .in('trip_id', tripIds)
      .order('seq_number', { ascending: true })

    // Group by trip_id
    for (const tp of allTripPassengers || []) {
      const p = (tp as any).passengers
      if (!p) continue
      if (!passengersByTripId[tp.trip_id]) passengersByTripId[tp.trip_id] = []
      passengersByTripId[tp.trip_id].push({ ...p, seq_number: tp.seq_number })
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="mb-8 flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Bookings</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-500">Total Trips: {trips?.length || 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {!trips || trips.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">No trips found</h3>
              <p className="text-slate-500 mb-4">You don't have any saved trip documents yet.</p>
              <Link href="/driver/trips/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
                Create your first document
              </Link>
            </div>
          </div>
        ) : (
          trips.map((trip) => {
            const dateObj = new Date(trip.trip_date)
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
            const formattedDate = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-')
            const passengers = passengersByTripId[trip.id] || []
            const primaryPassenger = passengers.find((p) => p.seq_number === 1) || passengers[0]
            const passengerCount = passengers.length

            return (
              <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300">
                {/* Card Header */}
                <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-700 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg leading-tight">Trip #{trip.trip_number}</h2>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{dayOfWeek}, {formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wide border border-emerald-500/30">
                      {trip.status}
                    </span>
                    {passengerCount > 0 && (
                      <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        {passengerCount} {passengerCount === 1 ? 'passenger' : 'passengers'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col space-y-4">
                  {/* Route */}
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                    <div className="flex items-start space-x-4 mb-4 relative">
                      <div className="w-5 h-5 rounded-full border-4 border-white bg-blue-500 shadow-sm z-10 flex-shrink-0 mt-0.5"></div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pickup</p>
                        <p className="font-semibold text-slate-800">{trip.pickup_location}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4 relative">
                      <div className="w-5 h-5 rounded-full border-4 border-white bg-emerald-500 shadow-sm z-10 flex-shrink-0 mt-0.5"></div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Dropoff</p>
                        <p className="font-semibold text-slate-800">{trip.dropoff_location}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Driver</p>
                      <p className="font-semibold text-slate-700 truncate">{(trip as any).drivers?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Vehicle</p>
                      <p className="font-semibold text-slate-700 truncate uppercase">{(trip as any).vehicles?.vehicle_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Primary Guest</p>
                      <p className="font-semibold text-slate-700 truncate capitalize">
                        {primaryPassenger?.full_name || <span className="text-slate-400 font-normal italic">No passenger data</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Trip Time</p>
                      <p className="font-semibold text-slate-700">{trip.trip_time || '—'}</p>
                    </div>
                  </div>

                  {/* Collapsible Passenger List */}
                  {passengerCount > 0 && (
                    <PassengerList passengers={passengers} />
                  )}
                </div>

                {/* Card Footer (Actions) */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <DeleteTripButton tripId={trip.id} />
                    <Link href={`/driver/trips/${trip.id}/edit`} className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300 transition-all text-xs font-semibold shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      <span>Edit</span>
                    </Link>
                    <Link href={`/driver/trips/${trip.id}/print`} className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-blue-600 border border-transparent text-white hover:bg-blue-700 transition-all text-xs font-semibold shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      <span>Print</span>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}