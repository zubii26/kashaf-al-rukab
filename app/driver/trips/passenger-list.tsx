'use client'

import { useState } from 'react'

interface Passenger {
  id: string
  full_name: string
  nationality: string
  passport_number: string | null
  seq_number: number
}

export default function PassengerList({ passengers }: { passengers: Passenger[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Passenger Manifest ({passengers.length})
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="divide-y divide-slate-50">
          {passengers.map((p, idx) => (
            <div key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-2 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate capitalize">{p.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{p.nationality}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 flex-shrink-0 bg-slate-50 px-2 py-0.5 rounded">
                {p.passport_number || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
