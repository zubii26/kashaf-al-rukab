import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanySettings } from '@/lib/company-settings'
import { getCompanyAssetUrl } from '@/lib/storage-url'
import { notFound } from 'next/navigation'

const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  scheduled: { label: 'Scheduled',  bg: '#DCFCE7', dot: '#16A34A' },
  completed:  { label: 'Completed',  bg: '#DBEAFE', dot: '#2563EB' },
  cancelled:  { label: 'Cancelled',  bg: '#FEE2E2', dot: '#DC2626' },
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F0F2F5' }}>
      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#111827', fontWeight: 700, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', maxWidth: '60%', textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#7d333b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{title}</span>
    </div>
  )
}

export default async function TripVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient()
  const { id } = await params

  const [tripResult, company] = await Promise.all([
    admin
      .from('trips')
      .select('trip_number, pickup_location, dropoff_location, trip_date, trip_time, status, drivers(full_name, nationality), vehicles(vehicle_type, plate_number)')
      .eq('id', id)
      .single(),
    getCompanySettings(),
  ])

  if (!tripResult.data) notFound()
  const trip = tripResult.data as any

  const { data: tripPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(full_name, nationality)')
    .eq('trip_id', id)
    .order('seq_number', { ascending: true })

  const passengers = (tripPassengers || []).map((tp: any) => tp.passengers).filter(Boolean)

  const dateObj   = new Date(trip.trip_date)
  const formatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' })

  const driver  = trip.drivers
  const vehicle = trip.vehicles

  const status = STATUS_CONFIG[trip.status] ?? { label: trip.status, bg: '#F3F4F6', dot: '#6B7280' }
  const logoUrl = getCompanyAssetUrl(company.logo_url)

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: 'linear-gradient(160deg, #0f1f3d 0%, #1a3560 40%, #7d333b 100%)', minHeight: '100vh', padding: '24px 16px 40px' }}>
      <div style={{ maxWidth: '460px', margin: '0 auto' }}>

        {/* ── Company Header Card ── */}
        <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px 16px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>

          {/* Logo */}
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company Logo" style={{ height: 72, objectFit: 'contain', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          )}

          {/* Company Name */}
          <div style={{ fontSize: 20, fontWeight: 900, color: '#7d333b', lineHeight: 1.2 }}>{company.name_ar}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', marginTop: 2 }}>{company.name_en}</div>

          {/* Company Details Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <span style={{ background: '#F7F9FC', border: '1px solid #E2E6EC', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#374151', fontWeight: 600 }}>
              C.R: {company.cr_number}
            </span>
            <span style={{ background: '#F7F9FC', border: '1px solid #E2E6EC', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#374151', fontWeight: 600 }}>
              Lic: {company.license_number}
            </span>
            {company.contact_phone && (
              <span style={{ background: '#F7F9FC', border: '1px solid #E2E6EC', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#374151', fontWeight: 600 }}>
                📞 {company.contact_phone}
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #E2E6EC, transparent)', margin: '16px 0 0' }} />
        </div>

        {/* ── Verified Badge + Trip Number ── */}
        <div style={{ background: '#14213D', padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 14px', marginBottom: 10 }}>
            <span style={{ fontSize: 13 }}>🛡️</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Official Trip Verification</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>Trip #{trip.trip_number}</div>
        </div>

        {/* ── Status Banner ── */}
        <div style={{ background: status.bg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.dot, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: status.dot, textTransform: 'uppercase', letterSpacing: '1px' }}>{status.label}</span>
        </div>

        {/* ── Trip Details ── */}
        <div style={{ background: 'white', padding: '4px 20px 0', boxShadow: '0 1px 0 #F0F2F5' }}>
          <div style={{ paddingTop: 14, paddingBottom: 2 }}>
            <SectionHeader title="Trip Details" icon="🗺️" />
          </div>
          <InfoRow label="Date"    value={`${formatted} — ${dayOfWeek}`} />
          <InfoRow label="Time"    value={trip.trip_time || '—'} />
          <InfoRow label="From"    value={trip.pickup_location} />
          <InfoRow label="To"      value={trip.dropoff_location} />
          <div style={{ paddingBottom: 8 }} />
        </div>

        {/* ── Driver & Vehicle ── */}
        <div style={{ background: 'white', padding: '4px 20px 0', marginTop: 2, boxShadow: '0 1px 0 #F0F2F5' }}>
          <div style={{ paddingTop: 14, paddingBottom: 2 }}>
            <SectionHeader title="Driver & Vehicle" icon="🚌" />
          </div>
          <InfoRow label="Driver"      value={driver?.full_name || '—'} />
          <InfoRow label="Nationality" value={driver?.nationality || '—'} />
          <InfoRow label="Vehicle"     value={vehicle?.vehicle_type || '—'} />
          <InfoRow label="Plate No."   value={vehicle?.plate_number || '—'} mono />
          <div style={{ paddingBottom: 8 }} />
        </div>

        {/* ── Passengers ── */}
        <div style={{ background: 'white', padding: '4px 20px 0', marginTop: 2 }}>
          <div style={{ paddingTop: 14, paddingBottom: 2 }}>
            <SectionHeader title={`Passengers (${passengers.length})`} icon="👥" />
          </div>
          {passengers.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', padding: '8px 0 12px' }}>No passengers registered for this trip.</p>
          ) : (
            <div style={{ paddingBottom: 8 }}>
              {passengers.map((p: any, idx: number) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: idx < passengers.length - 1 ? '1px solid #F0F2F5' : 'none'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #14213D, #7d333b)',
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0
                  }}>{idx + 1}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 14, textTransform: 'capitalize' }}>{p.full_name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>{p.nationality}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ background: '#14213D', borderRadius: '0 0 16px 16px', padding: '16px 20px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>
            Verified document issued by {company.name_en}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#4B5563', fontFamily: 'monospace', letterSpacing: '1px' }}>
            TRIP · {id.substring(0, 8).toUpperCase()}···{id.substring(id.length - 4).toUpperCase()}
          </p>
        </div>

      </div>
    </div>
  )
}
