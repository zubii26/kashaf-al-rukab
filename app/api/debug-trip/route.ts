import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tripId = searchParams.get('id')

  if (!tripId) return NextResponse.json({ error: 'No trip id' })

  // Test with NORMAL user client (RLS applies)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tp, error: tpError } = await supabase
    .from('trip_passengers')
    .select('*')
    .eq('trip_id', tripId)

  const { data: passengers, error: pError } = await supabase
    .from('passengers')
    .select('*')

  // Test with ADMIN client (bypasses RLS entirely)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: adminTp } = await adminClient
    .from('trip_passengers')
    .select('*, passengers(*)')
    .eq('trip_id', tripId)

  const { data: allTripPassengers } = await adminClient
    .from('trip_passengers')
    .select('trip_id')
    .limit(10)

  return NextResponse.json({
    auth_user_id: user?.id,
    // RLS-filtered results
    rls_trip_passengers: { data: tp, error: tpError?.message },
    rls_all_passengers: { data: passengers, error: pError?.message },
    // Admin (no RLS) results
    admin_trip_passengers_for_trip: adminTp,
    admin_sample_trip_passengers: allTripPassengers,
  })
}
