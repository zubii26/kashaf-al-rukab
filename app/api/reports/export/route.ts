import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const driver = searchParams.get('driver')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('trips')
    .select('trip_number, trip_date, trip_time, pickup_location, dropoff_location, price, price_type, status, drivers(full_name), vehicles(plate_number, vehicle_type)')
    .order('trip_date', { ascending: false })

  if (driver) query = query.eq('driver_id', driver)
  if (status) query = query.eq('status', status as any)
  if (from) query = query.gte('trip_date', from)
  if (to) query = query.lte('trip_date', to)

  const { data: trips, error } = await query
  if (error) return new NextResponse('Failed to fetch trips', { status: 500 })

  // Build worksheet rows
  const rows = (trips || []).map((t: any) => ({
    'Trip #': t.trip_number,
    'Date': t.trip_date,
    'Time': t.trip_time,
    'Pickup': t.pickup_location,
    'Dropoff': t.dropoff_location,
    'Driver': t.drivers?.full_name ?? '',
    'Vehicle': t.vehicles?.plate_number ?? '',
    'Vehicle Type': t.vehicles?.vehicle_type ?? '',
    'Price (SAR)': Number(t.price),
    'Price Type': t.price_type,
    'Status': t.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Trips')

  // Auto-fit columns
  const colWidths = Object.keys(rows[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }))
  ws['!cols'] = colWidths

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="trips-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
