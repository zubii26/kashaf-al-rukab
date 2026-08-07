'use client'

import { useState } from 'react'
import { submitInspectionAction } from './actions'

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

function ChecklistSection({
  title,
  titleAr,
  items,
  values,
  onChange,
}: {
  title: string
  titleAr: string
  items: { key: string; labelAr: string; labelEn: string }[]
  values: Record<string, 'ok' | 'not_ok'>
  onChange: (key: string, val: 'ok' | 'not_ok') => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-800 px-5 py-4">
        <h2 className="text-white font-bold text-base">{title}</h2>
        <p className="text-slate-400 text-sm" dir="rtl">{titleAr}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.key} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 text-sm">{item.labelEn}</p>
              <p className="text-slate-500 text-xs" dir="rtl">{item.labelAr}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onChange(item.key, 'ok')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  values[item.key] === 'ok'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                }`}
              >
                ✓ Sound
              </button>
              <button
                type="button"
                onClick={() => onChange(item.key, 'not_ok')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  values[item.key] === 'not_ok'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                — Fault
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DriverInspectionPage() {
  const allItems = [...DASHBOARD_ITEMS, ...EXTERNAL_ITEMS, ...SAFETY_ITEMS]
  const initialValues: Record<string, 'ok' | 'not_ok'> = {}
  for (const item of allItems) initialValues[item.key] = 'ok'
  const [values, setValues] = useState<Record<string, 'ok' | 'not_ok'>>(initialValues)
  const [declared, setDeclared] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (key: string, val: 'ok' | 'not_ok') => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!declared) {
      alert('Please confirm the driver declaration before submitting.')
      return
    }
    setIsSubmitting(true)
    const data = new FormData(e.currentTarget)
    // Add all boolean values
    allItems.forEach(item => {
      data.set(item.key, values[item.key])
    })
    data.set('driver_declaration_confirmed', 'true')
    try {
      await submitInspectionAction(data)
    } catch (err) {
      setIsSubmitting(false)
      throw err
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Daily Vehicle Inspection</h1>
        <p className="text-slate-500 text-sm mt-1" dir="rtl">سجل الفحص اليومي للمركبة</p>
        <p className="text-slate-400 text-xs mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ChecklistSection
          title="Dashboard Indicators"
          titleAr="مؤشرات لوحة القيادة"
          items={DASHBOARD_ITEMS}
          values={values}
          onChange={handleChange}
        />
        <ChecklistSection
          title="External Inspection"
          titleAr="الفحص الخارجي"
          items={EXTERNAL_ITEMS}
          values={values}
          onChange={handleChange}
        />
        <ChecklistSection
          title="Safety Equipment"
          titleAr="معدات السلامة"
          items={SAFETY_ITEMS}
          values={values}
          onChange={handleChange}
        />

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any additional notes about vehicle condition..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>

        {/* Driver Declaration */}
        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${declared ? 'border-emerald-300' : 'border-slate-200'}`}>
          <h3 className="font-semibold text-slate-800 mb-2">Driver Declaration</h3>
          <p className="text-sm text-slate-500 mb-4" dir="rtl">
            أقر أنا السائق بأن جميع المعلومات المقدمة في هذا الفحص دقيقة وصحيحة، وأن المركبة في حالة جيدة وصالحة للسير على الطريق.
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700">
              I declare that all information in this inspection is accurate and the vehicle is roadworthy.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!declared || isSubmitting}
          className="w-full py-4 bg-blue-600 text-white font-bold text-base rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {isSubmitting ? 'Submitting...' : '✓ Submit & Print Inspection'}
        </button>
      </form>
    </div>
  )
}