import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PrintButton from '@/app/driver/trips/[id]/print/print-button'
import { getCompanySettings } from '@/lib/company-settings'

const LEGAL_CLAUSE = `تم ابرام هذا العقد بين المتعاقدين بناء على المادة (39) التاسعة والثلاثون من اللائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات وبناء على الفقرة (1) من المادة (39) والتي تنص على أن يجب على الناقل ابرام عقد نقل مع الأطراف المحددين في المادة (40) قبل تنفيذ عمليات النقل على الطرق البرية وبما لا يخالف أحكام هذه اللائحة ووفقاً للآلية التي تحددها هيئة النقل`
const CANCELLATION_POLICY = `في حال الغاء التعاقد لاي سبب شخصي او اسباب اخرى تتعلق في الحجوزات او الانظمه تكون سياسة الالغاء والاستبدال حسب نظام وزارة التجارة السعودي في حالة الحجز وتم الالغاء قبل موعد الرحلة باكثر من 24 ساعة يتم استرداد المبلغ كامل. في حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسه يعتبر هذا الحجز وموافقته على الشروط والاحكام بالموقع الالكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الأول بواسطة حافلات المؤسسة المرخصة والمتوافقة مع الاشتراطات المقررة من هيئة النقل.`

export default async function PrintContractDocument({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const COMPANY = await getCompanySettings()

  // We fetch the trip data to construct the contract details dynamically for preview
  const { data: trip } = await supabase
    .from('trips')
    .select('*, drivers(photo_url)')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const driver = trip.drivers as any

  const dateObj = new Date(trip.trip_date)
  const formattedDate = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-')

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verifyUrl = `${APP_URL}/verify-contract/${trip.id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}&color=000000&bgcolor=FFFFFF&margin=4`

  // For this preview, we use generic placeholder names if booking data is not fully linked
  const partyTwoName = 'ZUBAIR'

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6 flex flex-col items-center print:block print:bg-white print:p-0">
      
      <div className="w-full max-w-[210mm] mb-5 flex justify-between items-center print:hidden">
        <Link href={`/driver/trips`} className="px-4 py-2 bg-white text-[#1F2430] rounded-md border border-[#E2E6EC] font-semibold text-sm hover:bg-[#F7F9FC]">
          ← Back to Trips
        </Link>
        <PrintButton />
      </div>

      <div className="bg-white w-full max-w-[210mm] print:max-w-none print:w-full relative" style={{ minHeight: '297mm', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        
        {/* Border wrapper for styling like PDF */}
        <div className="absolute inset-4 border-2 border-dotted border-[#C53030] print:inset-2 pointer-events-none"></div>

        <div className="p-12 print:p-10 pt-16 print:pt-12" dir="rtl">
          
          {/* HEADER */}
          <div className="flex justify-between items-start mb-8">
            <div className="text-right">
              <h1 className="text-2xl font-black text-[#C53030] mb-2">{COMPANY.nameAr}</h1>
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

            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                {driver?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={driver.photo_url} alt="Driver" className="w-[80px] h-[80px] object-cover border-2 border-[#14213D] rounded" style={{ objectPosition: 'top' }} />
                ) : (
                  <div className="w-[80px] h-[80px] border-2 border-dashed border-[#E2E6EC] bg-[#F7F9FC] flex flex-col items-center justify-center rounded">
                    <p className="text-[9px] text-[#9CA3AF] text-center">Driver<br/>Photo</p>
                  </div>
                )}
                <p className="text-[10px] font-bold text-[#C53030] uppercase text-center">صورة السائق</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="Barcode" width={80} height={80} style={{ border: '2px solid #14213D', borderRadius: '4px' }} />
                <p className="text-[10px] font-bold text-[#C53030] uppercase text-center">الباركود</p>
              </div>
            </div>
          </div>

          {/* TITLE */}
          <div className="text-center mb-8">
            <div className="inline-block border-2 border-[#C53030] px-12 py-2 rounded">
              <p className="text-xl font-black text-[#C53030]">عقد نقل على الطرق البرية</p>
            </div>
          </div>

          {/* DATE */}
          <div className="mb-6">
            <p className="font-bold text-[#C53030]">التاريخ: <span className="text-[#1F2430]">{formattedDate}</span></p>
          </div>

          {/* CLAUSE */}
          <div className="mb-8 text-sm leading-relaxed text-[#1F2430] text-justify">
            <p className="mb-4">{LEGAL_CLAUSE}</p>
            <p>وبناء على ما سبق تم ابرام عقد النقل بين الأطراف الآتية:</p>
          </div>

          {/* PARTIES */}
          <div className="mb-8 space-y-3">
            <p className="text-base">
              <span className="font-bold text-[#C53030]">الطرف الأول : </span>
              <span className="font-bold text-[#1F2430]">{COMPANY.nameAr} ترخيص رقم: {COMPANY.licenseNumber}</span>
            </p>
            <p className="text-base">
              <span className="font-bold text-[#C53030]">الطرف الثاني: </span>
              <span className="font-bold text-[#1F2430]">السيد/ <span className="uppercase">{partyTwoName}</span></span>
            </p>
          </div>

          <div className="mb-8 text-sm text-[#1F2430]">
            <p>اتفق الطرفان على ان ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا مع الطرف الثاني وتوصيلهم الى الجهه المحدده بالعقد</p>
          </div>

          {/* TRIP DETAILS */}
          <div className="mb-8 space-y-2 text-lg">
            <p><span className="font-black text-[#1F2430]">النقل من: </span><span className="font-bold text-[#C53030] uppercase">{trip.pickup_location}</span></p>
            <p><span className="font-black text-[#1F2430]">وصولا الى: </span><span className="font-bold text-[#C53030] uppercase">{trip.dropoff_location}</span></p>
            <p><span className="font-black text-[#1F2430]">مدة الرحلة : </span><span className="font-bold text-[#C53030]">00:00</span></p>
            <p><span className="font-black text-[#1F2430]">سعر الرحلة : </span><span className="font-bold text-[#C53030]">{trip.price_type === 'deferred' ? 'آجل' : 'نقدي'} ر.س</span></p>
          </div>

          {/* CANCELLATION POLICY */}
          <div className="mb-16 text-sm leading-relaxed text-[#1F2430] text-justify">
            <p>{CANCELLATION_POLICY}</p>
          </div>

          {/* STAMP */}
          <div className="flex justify-center mt-12 pb-12">
            {COMPANY.stamp_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={COMPANY.stamp_url} alt="Stamp" className="w-32 h-32 object-contain mix-blend-multiply" />
            ) : (
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#14213D] flex items-center justify-center">
                <p className="text-xs text-[#14213D] text-center font-bold">الختم<br/>OFFICIAL<br/>STAMP</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
