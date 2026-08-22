import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { getCompanySettings } from '@/lib/company-settings'
import PrintButton from '@/app/driver/trips/[id]/print/print-button'

const DASHBOARD_ITEMS = [
  { key: 'fuel_indicator_ok', labelAr: 'مؤشرات الوقود', labelEn: 'Fuel Indicator' },
  { key: 'temp_indicator_ok', labelAr: 'مؤشر الحرارة', labelEn: 'Temperature Indicator' },
  { key: 'oil_pressure_ok', labelAr: 'مؤشر ضغط الزيت', labelEn: 'Oil Pressure Indicator' },
  { key: 'check_engine_light_ok', labelAr: 'لمبة فحص المحرك', labelEn: 'Check Engine Light' },
  { key: 'abs_light_ok', labelAr: 'لمبة ABS', labelEn: 'ABS Light' },
  { key: 'warning_lights_ok', labelAr: 'لمبات التحذير', labelEn: 'Warning Lights' },
]
const EXTERNAL_ITEMS = [
  { key: 'tires_pressure_ok', labelAr: 'الإطارات وضغط الهواء', labelEn: 'Tires & Air Pressure' },
  { key: 'lights_front_rear_ok', labelAr: 'الانوار الامامية والخلفية', labelEn: 'Front & Rear Lights' },
  { key: 'warning_signals_ok', labelAr: 'الإشارات التحذيرية', labelEn: 'Warning Signals' },
  { key: 'glass_mirrors_ok', labelAr: 'الزجاج والمرايا', labelEn: 'Glass & Mirrors' },
  { key: 'no_leaks_ok', labelAr: 'عدم وجود تسريبات', labelEn: 'No Leaks' },
]
const SAFETY_ITEMS = [
  { key: 'fire_extinguisher_ok', labelAr: 'طفاية حريق سارية الصلاحية', labelEn: 'Valid Fire Extinguisher' },
  { key: 'warning_triangle_ok', labelAr: 'مثلث تحذيري', labelEn: 'Warning Triangle' },
  { key: 'first_aid_kit_ok', labelAr: 'حقيبة اسعافات أولية', labelEn: 'First Aid Kit' },
  { key: 'glass_hammer_ok', labelAr: 'مطرقة كسر الزجاج', labelEn: 'Glass Breaking Hammer' },
  { key: 'seatbelts_ok', labelAr: 'احزمة الأمان', labelEn: 'Seatbelts' },
]

export default async function StandaloneInspectionPrint({
  params,
}: {
  params: Promise<{ inspectionId: string }>
}) {
  const { inspectionId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: inspection } = await admin
    .from('vehicle_inspections')
    .select('*, drivers(full_name, nationality, card_number, mobile_number), vehicles(plate_number, vehicle_type, registration_number)')
    .eq('id', inspectionId)
    .single()

  if (!inspection) notFound()

  const company = await getCompanySettings()

  const driver = (inspection as any).drivers
  const vehicle = (inspection as any).vehicles
  const allSections = [
    { title: 'Dashboard Indicators', titleAr: 'مؤشرات لوحة القيادة', items: DASHBOARD_ITEMS },
    { title: 'External Inspection', titleAr: 'الفحص الخارجي', items: EXTERNAL_ITEMS },
    { title: 'Safety Equipment', titleAr: 'معدات السلامة', items: SAFETY_ITEMS },
  ]

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Vehicle Inspection — {vehicle?.plate_number}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; }
          .page { max-width: 210mm; margin: 0 auto; padding: 12mm; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 14px; }
          .logo { height: 90px; object-fit: contain; }
          .company-info { text-align: right; }
          .company-name-ar { font-size: 15px; font-weight: bold; color: #1e3a5f; }
          .company-name-en { font-size: 11px; color: #555; }
          .doc-title { text-align: center; font-size: 14px; font-weight: bold; background: #1e3a5f; color: white; padding: 8px; border-radius: 4px; margin-bottom: 14px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
          .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; }
          .info-box .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
          .info-box .value { font-weight: bold; font-size: 11px; }
          .section { margin-bottom: 10px; }
          .section-title { background: #f5f5f5; border-left: 4px solid #1e3a5f; padding: 5px 10px; font-weight: bold; font-size: 11px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #e0e0e0; padding: 5px 8px; }
          th { background: #f9f9f9; font-weight: bold; color: #333; }
          .ok { color: #16a34a; font-weight: bold; }
          .not_ok { color: #7d333b; font-weight: bold; }
          .notes-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px; min-height: 40px; margin: 10px 0; font-size: 10px; }
          .declaration { border: 1px solid #1e3a5f; border-radius: 4px; padding: 10px; margin: 10px 0; font-size: 10px; color: #333; }
          .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .sig-box { border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 10px; color: #555; padding-bottom: 20px; }
          .stamp-area { display: flex; align-items: center; justify-content: center; height: 80px; border: 1px dashed #aaa; border-radius: 50%; width: 80px; margin: 4px auto; }
          @media print { @page { size: A4; margin: 15mm; } .no-print { display: none !important; } }
        `}</style>
      </head>
      <body>
        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              {company.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="logo" />
              ) : (
                <img src="/logo.png" alt="Logo" className="logo" />
              )}
            </div>
            <div className="company-info">
              <div className="company-name-ar">{company.name_ar}</div>
              <div className="company-name-en">{company.name_en}</div>
              {company.cr_number && <div style={{ fontSize: 10, color: '#666' }}>CR: {company.cr_number}</div>}
              {company.license_number && <div style={{ fontSize: 10, color: '#666' }}>License: {company.license_number}</div>}
            </div>
          </div>

          <div className="doc-title">VEHICLE INSPECTION REPORT | سجل الفحص اليومي للمركبة</div>

          {/* Info Grid */}
          <div className="info-grid">
            <div className="info-box">
              <div className="label">Driver / السائق</div>
              <div className="value">{driver?.full_name || '—'}</div>
            </div>
            <div className="info-box">
              <div className="label">Inspection Date / تاريخ الفحص</div>
              <div className="value">{inspection.inspection_date}</div>
            </div>
            <div className="info-box">
              <div className="label">Vehicle Plate / لوحة المركبة</div>
              <div className="value">{vehicle?.plate_number || '—'}</div>
            </div>
            <div className="info-box">
              <div className="label">Vehicle Type / نوع المركبة</div>
              <div className="value">{vehicle?.vehicle_type || '—'}</div>
            </div>
          </div>

          {/* Checklist Sections */}
          {allSections.map(section => (
            <div key={section.title} className="section">
              <div className="section-title">{section.title} | {section.titleAr}</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>Item</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>✓ / —</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map(item => {
                    const val = (inspection as any)[item.key]
                    return (
                      <tr key={item.key}>
                        <td>{item.labelEn} | {item.labelAr}</td>
                        <td style={{ textAlign: 'center' }} className={val ? 'ok' : 'not_ok'}>
                          {val ? 'Sound ✓' : 'Fault —'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 16 }}>{val ? '✓' : '✗'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Notes */}
          {inspection.notes && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>Notes / ملاحظات</div>
              <div className="notes-box">{inspection.notes}</div>
            </div>
          )}

          {/* Declaration */}
          <div className="declaration">
            <strong>Driver Declaration:</strong> I declare that all information in this inspection is accurate and the vehicle is roadworthy.
            <br /><br />
            <strong style={{ direction: 'rtl', display: 'block' }}>إقرار السائق:</strong>
            <span style={{ direction: 'rtl', display: 'block', marginTop: 4 }}>أقر أنا السائق بأن جميع المعلومات المقدمة في هذا الفحص دقيقة وصحيحة، وأن المركبة في حالة جيدة وصالحة للسير على الطريق.</span>
          </div>

          {/* Signatures */}
          <div className="sig-row">
            <div className="sig-box">
              <div>Driver Signature / توقيع السائق</div>
              <div style={{ height: 30 }} />
              <div style={{ marginTop: 6 }}>{driver?.full_name}</div>
            </div>
            <div className="sig-box">
              <div>Company Stamp / ختم المؤسسة</div>
              {company.stamp_url ? (
                <img src={company.stamp_url} alt="stamp" style={{ height: 120, objectFit: 'contain', margin: '0 auto' }} />
              ) : (
                <div className="stamp-area"><span style={{ fontSize: 10, color: '#aaa' }}>STAMP</span></div>
              )}
            </div>
          </div>

          <div className="no-print" style={{ textAlign: 'center', marginTop: 20 }}>
            <PrintButton />
          </div>
        </div>
      </body>
    </html>
  )
}
