import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PrintButton from '@/app/driver/trips/[id]/print/print-button'
import { getCompanySettings } from '@/lib/company-settings'


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

export default async function PrintInspectionDocument({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const COMPANY = await getCompanySettings()

  // Fetch trip with driver + vehicle data to generate a preview checklist
  const { data: trip } = await supabase
    .from('trips')
    .select(`
      *,
      drivers(full_name),
      vehicles(plate_number)
    `)
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const dateObj = new Date(trip.trip_date)
  const formattedDate = dateObj.toLocaleDateString('en-CA') // YYYY-MM-DD

  const driver = (trip as any).drivers
  const vehicle = (trip as any).vehicles

  // For the generated preview, we just check them all as "سليم" (OK)
  const isOk = true

  const renderSection = (title: string, items: typeof DASHBOARD_ITEMS) => (
    <div className="mb-6">
      <h2 className="text-[#7d333b] font-bold text-lg mb-2" dir="rtl">{title}</h2>
      <table className="w-full border-t border-b border-[#14213D] text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-[#E2E6EC]">
            <th className="py-3 px-4 text-right font-bold text-[#14213D] w-1/2">البند</th>
            <th className="py-3 px-4 text-center font-bold text-[#14213D]">سليم</th>
            <th className="py-3 px-4 text-center font-bold text-[#14213D]">غير سليم</th>
            <th className="py-3 px-4 text-right font-bold text-[#14213D]">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-[#E2E6EC] last:border-0">
              <td className="py-3 px-4 font-semibold text-[#1F2430]">{item.labelAr}</td>
              <td className="py-3 px-4 text-center text-[#1E824C]">{isOk ? '✓' : '—'}</td>
              <td className="py-3 px-4 text-center text-[#7d333b]">{!isOk ? '✗' : '—'}</td>
              <td className="py-3 px-4 text-[#6B7280]"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6 flex flex-col items-center print:block print:bg-white print:p-0">
      
      <div className="w-full max-w-[210mm] mb-5 flex justify-between items-center print:hidden">
        <Link href="/driver/trips" className="px-4 py-2 bg-white text-[#1F2430] rounded-md border border-[#E2E6EC] font-semibold text-sm hover:bg-[#F7F9FC]">
          ← Back to Trips
        </Link>
        <PrintButton />
      </div>

      <div 
        className="bg-white w-full max-w-[210mm] print:max-w-none print:w-full relative" 
        style={{ minHeight: '297mm', fontFamily: "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Border wrapper for styling like PDF */}
        <div className="absolute inset-4 border-[3px] border-dotted border-[#7d333b] print:inset-2 pointer-events-none"></div>

        <div className="p-12 print:p-8 pt-16 print:pt-10">
          
          {/* HEADER */}
          <div className="flex justify-between items-start mb-8">
            <div className="text-right">
              <h1 className="text-2xl font-black text-[#7d333b] mb-2">{COMPANY.nameAr}</h1>
              <p className="text-sm font-bold text-[#6B7280]">س.ت: {COMPANY.crNumber}</p>
              <p className="text-sm font-bold text-[#6B7280]">ترخيص رقم: {COMPANY.licenseNumber}</p>
            </div>
            
            <div className="text-center">
              {COMPANY.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={COMPANY.logo_url} alt="Logo" className="w-48 h-20 object-contain" />
              ) : (
                <div className="w-48 h-16 flex items-center justify-center">
                  <p className="text-[24px] font-black text-[#14213D] leading-tight" dir="ltr">{COMPANY.nameEn}</p>
                </div>
              )}
            </div>

            <div className="w-48 flex justify-end">
              {/* Empty space to balance flexbox */}
            </div>
          </div>

          {/* TITLE */}
          <div className="text-center mb-8">
            <div className="inline-block border-2 border-[#7d333b] px-12 py-2 rounded">
              <p className="text-xl font-black text-[#7d333b]">سجل الفحص اليومي للسيارة</p>
            </div>
          </div>

          {/* META INFO */}
          <div className="flex justify-between items-end border-b-2 border-[#14213D] pb-4 mb-8" dir="rtl">
            <div className="flex gap-12">
              <div>
                <p className="text-sm font-bold text-[#7d333b] mb-1">اسم الشركة</p>
                <p className="font-semibold text-[#1F2430]">{COMPANY.nameAr}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#7d333b] mb-1">لوحة المركبة</p>
                <p className="font-semibold text-[#1F2430] font-mono tracking-wider">{vehicle?.plate_number || '—'}</p>
              </div>
            </div>
            <div className="flex gap-12 text-left" dir="ltr">
              <div>
                <p className="text-sm font-bold text-[#7d333b] mb-1 text-right" dir="rtl">اسم السائق</p>
                <p className="font-semibold text-[#1F2430] uppercase">{driver?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#7d333b] mb-1 text-right" dir="rtl">التاريخ</p>
                <p className="font-semibold text-[#1F2430]">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* SECTIONS */}
          {renderSection('أولاً: فحص مؤشرات لوحة القيادة', DASHBOARD_ITEMS)}
          {renderSection('ثانياً: الفحص الخارجي', EXTERNAL_ITEMS)}
          {renderSection('ثالثاً: أدوات ومتطلبات السلامة', SAFETY_ITEMS)}

          {/* FOOTER */}
          <div className="mt-12 pt-6 pb-8" dir="rtl">
            <p className="text-sm font-bold text-[#1F2430] mb-8">
              إقرار السائق: أقر بأنني قمت بفحص الحافلة والتأكد من سلامتها وجاهزيتها قبل التشغيل.
            </p>
            <div className="flex justify-between items-end">
              <div className="w-32 text-right">
                {/* Spacer for flex-between balance */}
              </div>
              <div className="flex justify-center">
                {COMPANY.stamp_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={COMPANY.stamp_url} alt="Stamp" className="w-48 h-48 object-contain mix-blend-multiply" />
                ) : (
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#14213D] flex items-center justify-center">
                    <p className="text-[10px] text-[#14213D] text-center font-bold">الختم<br/>OFFICIAL<br/>STAMP</p>
                  </div>
                )}
              </div>
              <div className="w-32 text-left" dir="ltr">
                <p className="text-[10px] font-mono font-bold text-[#6B7280] uppercase tracking-widest whitespace-nowrap">
                  TRIP NO: {(trip as any).trip_number || '—'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
