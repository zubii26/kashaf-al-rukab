import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PrintButton from './print-button'
import { getCompanySettings } from '@/lib/company-settings'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const LEGAL_CLAUSE = `تم ابرام هذا العقد بين المتعاقدين بناءً على المادة (39) من اللائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات، والتي تنص على وجوب إبرام عقد نقل مع الأطراف المحددين في المادة (40) قبل تنفيذ عمليات النقل على الطرق البرية وفقاً للآلية التي تحددها هيئة النقل.`
const CANCELLATION_POLICY = `سياسة الإلغاء: في حال الإلغاء قبل موعد الرحلة بأكثر من 24 ساعة يتم استرداد المبلغ كاملاً. الحجز عبر الموقع الإلكتروني والموافقة على الشروط والأحكام يُعدّ موافقةً على هذا العقد.`

const DASHBOARD_ITEMS = ['مؤشرات الوقود', 'مؤشر الحرارة', 'مؤشر ضغط الزيت', 'لمبة فحص المحرك', 'لمبة ABS', 'لمبات التحذير']
const EXTERNAL_ITEMS = ['الإطارات وضغط الهواء', 'الأنوار الأمامية والخلفية', 'الإشارات التحذيرية', 'الزجاج والمرايا', 'عدم وجود تسريبات']
const SAFETY_ITEMS = ['طفاية حريق سارية الصلاحية', 'مثلث تحذيري', 'حقيبة إسعافات أولية', 'مطرقة كسر الزجاج', 'أحزمة الأمان']

const DAY_AR: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
}

const S = {
  cell: { border: '1px solid #E2E6EC', padding: '4px 8px', fontSize: 11 } as React.CSSProperties,
  lcell: { border: '1px solid #E2E6EC', padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#6B7280', background: '#F7F9FC' } as React.CSSProperties,
  hcell: { border: '1px solid #14213D', padding: '4px 8px', fontSize: 11, fontWeight: 700, textAlign: 'right' as const, background: '#14213D', color: 'white' },
  stamp: { width: 72, height: 72, borderRadius: '50%', border: '2px dashed #14213D', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 } as React.CSSProperties,
}

export default async function PrintAllDocuments({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { id } = await params

  const COMPANY = await getCompanySettings()

  const { data: trip } = await supabase
    .from('trips')
    .select(`*, drivers(full_name, nationality, card_number, mobile_number, photo_url), vehicles(plate_number, vehicle_type, registration_number)`)
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const { data: tripPassengers } = await admin
    .from('trip_passengers')
    .select('seq_number, passengers(full_name, nationality, passport_number)')
    .eq('trip_id', id)
    .order('seq_number', { ascending: true })

  const passengers = (tripPassengers || [])
    .map((tp: any) => ({ ...tp.passengers, seq: tp.seq_number }))
    .filter(Boolean)

  const dateObj = new Date(trip.trip_date)
  const dayEN = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const dayAR = DAY_AR[dayEN] || dayEN
  const dateDash = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-')
  const dateAR = dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const driver = (trip as any).drivers
  const vehicle = (trip as any).vehicles

  const verifyUrl = `${APP_URL}/verify/${id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(verifyUrl)}&color=14213D&bgcolor=FFFFFF&margin=2`
  const partyTwo = passengers.length > 0 ? passengers[0].full_name : '—'

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    maxHeight: '297mm',
    overflow: 'hidden',
    backgroundColor: 'white',
    position: 'relative',
    margin: '0 auto',
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    boxSizing: 'border-box',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-6 flex flex-col items-center print:block print:bg-white print:py-0">

      {/* زر الطباعة - يُخفى عند الطباعة */}
      <div className="w-[210mm] mb-4 flex justify-between items-center print:hidden">
        <Link href="/driver/trips" className="px-4 py-2 bg-white text-[#1F2430] rounded border border-[#E2E6EC] text-sm font-medium">
          ← رجوع
        </Link>
        <PrintButton />
      </div>

      {/* ══ صفحة 1: عقد النقل ══ */}
      <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }} className="mb-6 print:mb-0">
        <div style={pageStyle}>
          <div style={{ position: 'absolute', inset: 6, border: '2px dotted #C53030', pointerEvents: 'none' }} />
          <div style={{ padding: '20px 28px', direction: 'rtl', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* الترويسة */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #14213D', paddingBottom: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#C53030' }}>{COMPANY.nameAr}</div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>س.ت: {COMPANY.crNumber} | ترخيص: {COMPANY.licenseNumber}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COMPANY.logo_url || '/logo.png'} alt="شعار" style={{ height: 50, objectFit: 'contain', maxWidth: 140 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  {driver?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={driver.photo_url} alt="السائق" style={{ width: 58, height: 58, objectFit: 'cover', border: '2px solid #14213D', borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 58, height: 58, border: '2px dashed #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC' }}>
                      <span style={{ fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>صورة<br/>السائق</span>
                    </div>
                  )}
                  <div style={{ fontSize: 8, color: '#C53030', fontWeight: 700, marginTop: 2 }}>السائق</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR" style={{ width: 58, height: 58, border: '2px solid #14213D', borderRadius: 4 }} />
                  <div style={{ fontSize: 8, color: '#C53030', fontWeight: 700, marginTop: 2 }}>امسح للتحقق</div>
                </div>
              </div>
            </div>

            {/* عنوان العقد */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', border: '2px solid #C53030', padding: '3px 28px', borderRadius: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#C53030' }}>عقد نقل على الطرق البرية</div>
              </div>
            </div>

            {/* التاريخ */}
            <div style={{ fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: '#C53030' }}>التاريخ: </span>
              <span>{dateDash} — {dayAR}</span>
            </div>

            {/* النص القانوني */}
            <div style={{ fontSize: 10, lineHeight: 1.75, color: '#1F2430', textAlign: 'justify' }}>{LEGAL_CLAUSE}</div>

            <div style={{ fontSize: 10 }}>وبناءً على ما سبق تم إبرام عقد النقل بين الأطراف الآتية:</div>

            {/* الأطراف */}
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><span style={{ fontWeight: 700, color: '#C53030' }}>الطرف الأول: </span><span style={{ fontWeight: 700 }}>{COMPANY.nameAr}</span></div>
              <div><span style={{ fontWeight: 700, color: '#C53030' }}>الطرف الثاني: </span><span style={{ fontWeight: 700 }}>السيد/ {partyTwo}</span></div>
            </div>

            {/* تفاصيل الرحلة */}
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><span style={{ fontWeight: 900 }}>النقل من: </span><span style={{ fontWeight: 700, color: '#C53030', textTransform: 'uppercase' }}>{trip.pickup_location}</span></div>
              <div><span style={{ fontWeight: 900 }}>وصولاً إلى: </span><span style={{ fontWeight: 700, color: '#C53030', textTransform: 'uppercase' }}>{trip.dropoff_location}</span></div>
              <div><span style={{ fontWeight: 900 }}>يوم: </span><span style={{ fontWeight: 700, color: '#C53030' }}>{dayAR} — {dateAR}</span></div>
              <div><span style={{ fontWeight: 900 }}>سعر الرحلة: </span><span style={{ fontWeight: 700, color: '#C53030' }}>{trip.price_type === 'deferred' ? 'آجل' : 'نقدي'} ر.س</span></div>
            </div>

            {/* سياسة الإلغاء */}
            <div style={{ fontSize: 10, lineHeight: 1.7, color: '#1F2430', textAlign: 'justify' }}>{CANCELLATION_POLICY}</div>

            <div style={{ fontSize: 10, color: '#1F2430' }}>
              اتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه من الموقع المحدد مسبقاً وتوصيلهم إلى الجهة المحددة بالعقد.
            </div>

            {/* الختم — يظهر فقط إذا تم رفع الختم */}
            {COMPANY.stamp_url && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COMPANY.stamp_url} alt="الختم الرسمي" style={{ width: 90, height: 90, objectFit: 'contain' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ صفحة 2: بيانات السائق والركاب ══ */}
      <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }} className="mb-6 print:mb-0">
        <div style={pageStyle}>
          <div style={{ padding: '18px 26px', direction: 'rtl', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* الترويسة */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #14213D', paddingBottom: 8 }}>
              <div style={{ fontSize: 8, color: '#6B7280' }}>بسم الله الرحمن الرحيم</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#14213D' }}>{COMPANY.nameAr}</div>
              <div style={{ display: 'inline-block', border: '2px solid #14213D', padding: '2px 20px', marginTop: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#14213D' }}>بيانات السائق والركاب</div>
              </div>
            </div>

            {/* معلومات الرحلة */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={S.lcell}>رقم الرحلة</td>
                  <td style={{ ...S.cell, fontWeight: 700, color: '#14213D' }}>#{trip.trip_number}</td>
                  <td style={S.lcell}>التاريخ</td>
                  <td style={S.cell}>{dateAR}</td>
                  <td style={S.lcell}>اليوم</td>
                  <td style={S.cell}>{dayAR}</td>
                  <td style={S.lcell}>الوقت</td>
                  <td style={S.cell}>{trip.trip_time || '—'}</td>
                </tr>
                <tr>
                  <td style={S.lcell}>من</td>
                  <td style={{ ...S.cell, fontWeight: 600, textTransform: 'uppercase' }}>{trip.pickup_location}</td>
                  <td style={S.lcell}>إلى</td>
                  <td style={{ ...S.cell, fontWeight: 600, textTransform: 'uppercase' }} colSpan={5}>{trip.dropoff_location}</td>
                </tr>
              </tbody>
            </table>

            {/* السائق */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 3, height: 16, background: '#14213D' }} />
                <span style={{ fontWeight: 900, color: '#14213D', fontSize: 11 }}>بيانات السائق والمركبة</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={S.hcell}>اسم السائق</th>
                  <th style={S.hcell}>الجنسية</th>
                  <th style={S.hcell}>رقم البطاقة</th>
                  <th style={S.hcell}>نوع المركبة</th>
                  <th style={S.hcell}>رقم اللوحة</th>
                </tr></thead>
                <tbody><tr>
                  <td style={{ ...S.cell, fontWeight: 600, textTransform: 'uppercase' }}>{driver?.full_name || '—'}</td>
                  <td style={S.cell}>{driver?.nationality || '—'}</td>
                  <td style={{ ...S.cell, fontFamily: 'monospace' }}>{driver?.card_number || '—'}</td>
                  <td style={{ ...S.cell, textTransform: 'uppercase' }}>{vehicle?.vehicle_type || '—'}</td>
                  <td style={{ ...S.cell, fontFamily: 'monospace', fontWeight: 700 }}>{vehicle?.plate_number || '—'}</td>
                </tr></tbody>
              </table>
            </div>

            {/* الركاب — فقط الركاب الحقيقيين */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 3, height: 16, background: '#14213D' }} />
                  <span style={{ fontWeight: 900, color: '#14213D', fontSize: 11 }}>قائمة الركاب</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#14213D', background: '#F7F9FC', border: '1px solid #E2E6EC', padding: '2px 8px' }}>
                  المجموع: {passengers.length}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ ...S.hcell, textAlign: 'center', width: 28 }}>#</th>
                  <th style={S.hcell}>اسم الراكب</th>
                  <th style={{ ...S.hcell, width: 100 }}>الجنسية</th>
                  <th style={{ ...S.hcell, width: 130 }}>رقم الجواز / الهوية</th>
                </tr></thead>
                <tbody>
                  {passengers.map((p: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : 'white' }}>
                      <td style={{ ...S.cell, textAlign: 'center', fontWeight: 700, color: '#14213D' }}>{i + 1}</td>
                      <td style={{ ...S.cell, fontWeight: 600, textTransform: 'uppercase' }}>{p.full_name}</td>
                      <td style={S.cell}>{p.nationality}</td>
                      <td style={{ ...S.cell, fontFamily: 'monospace' }}>{p.passport_number}</td>
                    </tr>
                  ))}
                  {passengers.length === 0 && (
                    <tr><td colSpan={4} style={{ ...S.cell, textAlign: 'center', color: '#9CA3AF' }}>لا يوجد ركاب مضافون</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* التذييل */}
            <div style={{ borderTop: '2px solid #14213D', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#6B7280' }}>للاستفسار: {COMPANY.contactPhone}</div>
              <div style={{ display: 'flex', gap: 40, textAlign: 'center', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#14213D', marginBottom: 20 }}>توقيع السائق</div>
                  <div style={{ width: 90, borderBottom: '1px solid #14213D' }} />
                </div>
                {COMPANY.stamp_url && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#14213D', marginBottom: 4 }}>الختم الرسمي</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={COMPANY.stamp_url} alt="الختم" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ صفحة 3: سجل الفحص اليومي ══ */}
      <div>
        <div style={pageStyle}>
          <div style={{ position: 'absolute', inset: 6, border: '2px dotted #C53030', pointerEvents: 'none' }} />
          <div style={{ padding: '18px 28px', direction: 'rtl', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* الترويسة */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#14213D' }}>{COMPANY.nameAr}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C53030', marginTop: 2 }}>سجل الفحص اليومي للمركبة</div>
            </div>

            {/* معلومات */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #14213D', paddingBottom: 8, fontSize: 10 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div><div style={{ fontWeight: 700, color: '#C53030', marginBottom: 2 }}>اسم الشركة</div><div style={{ fontWeight: 600 }}>{COMPANY.nameAr}</div></div>
                <div><div style={{ fontWeight: 700, color: '#C53030', marginBottom: 2 }}>لوحة المركبة</div><div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{vehicle?.plate_number || '—'}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div><div style={{ fontWeight: 700, color: '#C53030', marginBottom: 2 }}>اسم السائق</div><div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{driver?.full_name || '—'}</div></div>
                <div><div style={{ fontWeight: 700, color: '#C53030', marginBottom: 2 }}>التاريخ</div><div style={{ fontWeight: 600 }}>{dateDash}</div></div>
              </div>
            </div>

            {/* جداول الفحص */}
            {[
              { title: 'أولاً: فحص مؤشرات لوحة القيادة', items: DASHBOARD_ITEMS },
              { title: 'ثانياً: الفحص الخارجي', items: EXTERNAL_ITEMS },
              { title: 'ثالثاً: أدوات ومتطلبات السلامة', items: SAFETY_ITEMS },
            ].map((section, sIdx) => (
              <div key={sIdx}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#C53030', marginBottom: 3 }}>{section.title}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #14213D', background: '#F7F9FC' }}>
                      <th style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: '#14213D', width: '50%' }}>البند</th>
                      <th style={{ padding: '3px 8px', textAlign: 'center', fontWeight: 700, color: '#14213D', width: '15%' }}>سليم</th>
                      <th style={{ padding: '3px 8px', textAlign: 'center', fontWeight: 700, color: '#14213D', width: '15%' }}>غير سليم</th>
                      <th style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: '#14213D' }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E2E6EC', background: idx % 2 === 1 ? '#F7F9FC' : 'white' }}>
                        <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1F2430' }}>{item}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#1E824C', fontWeight: 700 }}>✓</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#C53030' }}>—</td>
                        <td style={{ padding: '4px 8px' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* إقرار وختم */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#1F2430', marginBottom: 12 }}>
                إقرار السائق: أقر بأنني قمت بفحص الحافلة والتأكد من سلامتها وجاهزيتها قبل التشغيل.
              </div>
              {COMPANY.stamp_url && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={COMPANY.stamp_url} alt="الختم الرسمي" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
