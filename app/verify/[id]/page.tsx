import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export default async function TripVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient()
  const { id } = await params

  // Public read — admin client, read-only, no sensitive data exposed
  const { data: trip } = await admin
    .from('trips')
    .select('trip_number, pickup_location, dropoff_location, trip_date, trip_time, status, drivers(full_name, nationality), vehicles(vehicle_type, plate_number)')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const { data: tripPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(full_name, nationality)')
    .eq('trip_id', id)
    .order('seq_number', { ascending: true })

  const passengers = (tripPassengers || [])
    .map((tp: any) => tp.passengers)
    .filter(Boolean)

  const dateObj = new Date((trip as any).trip_date)
  const formattedDate = dateObj.toLocaleDateString('en-GB')
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' })

  const driver = (trip as any).drivers
  const vehicle = (trip as any).vehicles

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F7F9FC', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#14213D', color: 'white', borderRadius: '12px 12px 0 0', padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>Official Trip Verification</p>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>Trip #{(trip as any).trip_number}</h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Kashaf Al Rukab Transport</p>
        </div>

        {/* Status Banner */}
        <div style={{
          background: (trip as any).status === 'scheduled' ? '#1E824C' : '#2B6CB0',
          color: 'white', padding: '10px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase'
        }}>
          ● {(trip as any).status}
        </div>

        {/* Trip Info */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', padding: '20px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: '#6B7280', fontWeight: 600, width: '40%' }}>Date</td>
                <td style={{ padding: '8px 0', color: '#1F2430', fontWeight: 700 }}>{formattedDate} — {dayOfWeek}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #E2E6EC' }}>
                <td style={{ padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>Time</td>
                <td style={{ padding: '8px 0', color: '#1F2430', fontWeight: 700 }}>{(trip as any).trip_time || '—'}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #E2E6EC' }}>
                <td style={{ padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>From</td>
                <td style={{ padding: '8px 0', color: '#1F2430', fontWeight: 700, textTransform: 'capitalize' }}>{(trip as any).pickup_location}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #E2E6EC' }}>
                <td style={{ padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>To</td>
                <td style={{ padding: '8px 0', color: '#1F2430', fontWeight: 700, textTransform: 'capitalize' }}>{(trip as any).dropoff_location}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Driver & Vehicle */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderTop: 'none', padding: '16px 24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Driver & Vehicle</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', color: '#6B7280', fontWeight: 600, width: '40%' }}>Driver</td>
                <td style={{ padding: '6px 0', color: '#1F2430', fontWeight: 700, textTransform: 'capitalize' }}>{driver?.full_name || '—'}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #E2E6EC' }}>
                <td style={{ padding: '6px 0', color: '#6B7280', fontWeight: 600 }}>Vehicle</td>
                <td style={{ padding: '6px 0', color: '#1F2430', fontWeight: 700, textTransform: 'uppercase' }}>{vehicle?.vehicle_type || '—'}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #E2E6EC' }}>
                <td style={{ padding: '6px 0', color: '#6B7280', fontWeight: 600 }}>Plate No.</td>
                <td style={{ padding: '6px 0', color: '#1F2430', fontWeight: 700, fontFamily: 'monospace' }}>{vehicle?.plate_number || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Passengers */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderTop: 'none', padding: '16px 24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Passengers ({passengers.length})
          </p>
          {passengers.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: '13px', fontStyle: 'italic' }}>No passengers registered</p>
          ) : (
            <div>
              {passengers.map((p: any, idx: number) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 0', borderTop: idx > 0 ? '1px solid #E2E6EC' : 'none'
                }}>
                  <span style={{ width: '24px', height: '24px', background: '#14213D', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1F2430', fontSize: '14px', textTransform: 'capitalize' }}>{p.full_name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>{p.nationality}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#14213D', color: '#9CA3AF', borderRadius: '0 0 12px 12px', padding: '14px 24px', textAlign: 'center', fontSize: '11px' }}>
          <p style={{ margin: 0 }}>This document is auto-generated by Kashaf Al Rukab Transport System</p>
          <p style={{ margin: '4px 0 0', color: '#6B7280', fontFamily: 'monospace' }}>ID: {id.substring(0, 16).toUpperCase()}</p>
        </div>

      </div>
    </div>
  )
}
