'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateTripAction } from './actions'
import { DocumentScannerUpload } from '@/components/driver/DocumentScannerUpload'
import type { ExtractedPassenger, ScanResult } from '@/lib/ai/extractDocument'

interface Passenger {
  id: string          // empty string = new passenger
  full_name: string
  nationality: string
  passport_number: string
  seq_number: number
  isNew: boolean
  _removed?: boolean  // marked for deletion
}

interface Props {
  tripId: string
  initialTrip: {
    pickup_location: string
    dropoff_location: string
    trip_date: string
    trip_time: string
  }
  initialPassengers: Passenger[]
}

export default function EditTripForm({ tripId, initialTrip, initialPassengers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Trip fields
  const [pickup, setPickup] = useState(initialTrip.pickup_location)
  const [dropoff, setDropoff] = useState(initialTrip.dropoff_location)
  const [date, setDate] = useState(initialTrip.trip_date)
  const [time, setTime] = useState(initialTrip.trip_time)

  // Passengers
  const [passengers, setPassengers] = useState<Passenger[]>(
    initialPassengers.length > 0
      ? initialPassengers
      : [{ id: '', full_name: '', nationality: '', passport_number: '', seq_number: 1, isNew: true }]
  )

  // ── Review-before-save state ──────────────────────────────────────────────
  const [pendingBatch, setPendingBatch] = useState<{
    passengers: ExtractedPassenger[]
    warnings: string[]
  } | null>(null)

  const activePassengers = passengers.filter(p => !p._removed)

  const updatePassenger = (idx: number, field: keyof Passenger, value: string) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  // ── Scan success: store in pendingBatch for review ────────────────────────
  const handleBatchScanSuccess = (data: ScanResult) => {
    setPendingBatch({
      passengers: data.passengers,
      warnings: data.warnings,
    })
  }

  // ── Review table: edit a pending passenger field ──────────────────────────
  const updatePendingPassenger = (index: number, field: keyof ExtractedPassenger, value: string) => {
    setPendingBatch(prev => {
      if (!prev) return prev
      const updated = [...prev.passengers]
      updated[index] = { ...updated[index], [field]: value || null }
      return { ...prev, passengers: updated }
    })
  }

  // ── Review table: remove a pending passenger row ──────────────────────────
  const removePendingPassenger = (index: number) => {
    setPendingBatch(prev => {
      if (!prev) return prev
      const updated = prev.passengers.filter((_, i) => i !== index)
      if (updated.length === 0) return null
      return { ...prev, passengers: updated }
    })
  }

  // ── Review table: confirm all → append to passenger list ──────────────────
  const confirmBatch = () => {
    if (!pendingBatch) return

    setPassengers(prev => {
      const current = [...prev]
      const maxSeq = Math.max(...current.map(p => p.seq_number), 0)
      const maxAllowed = 50 - current.filter(p => !p._removed).length

      const toAdd = pendingBatch.passengers.slice(0, maxAllowed)

      toAdd.forEach((p, i) => {
        // Try to fill an empty row first
        const emptyIdx = current.findIndex(
          existing => !existing._removed && !existing.full_name && !existing.passport_number
        )

        if (emptyIdx !== -1) {
          current[emptyIdx] = {
            ...current[emptyIdx],
            full_name: p.full_name || '',
            nationality: p.nationality || '',
            passport_number: p.passport_number || p.visa_number || '',
          }
        } else {
          current.push({
            id: '',
            full_name: p.full_name || '',
            nationality: p.nationality || '',
            passport_number: p.passport_number || p.visa_number || '',
            seq_number: maxSeq + i + 1,
            isNew: true,
          })
        }
      })

      return current
    })

    setPendingBatch(null)
  }

  // ── Cancel batch ──────────────────────────────────────────────────────────
  const cancelBatch = () => {
    setPendingBatch(null)
  }

  const addPassenger = () => {
    const nextSeq = Math.max(...passengers.map(p => p.seq_number), 0) + 1
    setPassengers(prev => [...prev, {
      id: '',
      full_name: '',
      nationality: '',
      passport_number: '',
      seq_number: nextSeq,
      isNew: true,
    }])
  }

  const removePassenger = (idx: number) => {
    const p = passengers[idx]
    if (p.isNew) {
      // New unsaved passenger — just remove from array
      setPassengers(prev => prev.filter((_, i) => i !== idx))
    } else {
      // Existing passenger — mark for deletion
      setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, _removed: true } : p))
    }
  }

  const handleSave = async (printAfter: boolean) => {
    setSaving(true)
    setSuccessMsg('')
    try {
      const payload = {
        tripId,
        trip: { pickup_location: pickup, dropoff_location: dropoff, trip_date: date, trip_time: time },
        passengers: passengers.map(p => ({
          id: p.id,
          full_name: p.full_name,
          nationality: p.nationality,
          passport_number: p.passport_number,
          seq_number: p.seq_number,
          isNew: p.isNew || !p.id,
          _removed: p._removed || false,
        })),
      }
      const result = await updateTripAction(payload)
      if (result?.success) {
        setSuccessMsg('Trip saved successfully!')
        if (printAfter) {
          router.push(`/driver/trips/${tripId}/print`)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Trip</h1>
          <p className="text-slate-500 text-sm mt-1">Update trip details and manage passengers</p>
        </div>
        <Link href="/driver/trips" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
          ← Back to Trips
        </Link>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-emerald-800">{successMsg}</p>
        </div>
      )}

      {/* Trip Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <h2 className="font-bold text-slate-700 text-lg border-b border-slate-100 pb-3">Trip Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-600 block">Pickup Location</label>
            <input
              value={pickup} onChange={e => setPickup(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-600 block">Dropoff Location</label>
            <input
              value={dropoff} onChange={e => setDropoff(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-600 block">Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-600 block">Time</label>
            <input
              type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Passengers Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-slate-700 text-lg">Passengers</h2>
            <p className="text-slate-400 text-xs mt-0.5">{activePassengers.length} passenger{activePassengers.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={addPassenger}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Passenger
          </button>
        </div>

        <div className="mb-6">
          <DocumentScannerUpload onBatchScanSuccess={handleBatchScanSuccess} />
        </div>

        {/* ── Review-before-save table ────────────────────────────────────── */}
        {pendingBatch && pendingBatch.passengers.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-primary">
                Review Extracted Passengers ({pendingBatch.passengers.length})
              </h4>
              <span className="text-xs text-text-secondary">
                Edit fields before confirming
              </span>
            </div>

            {/* Warnings */}
            {pendingBatch.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
                {pendingBatch.warnings.map((w, i) => (
                  <p key={i}>⚠ {w}</p>
                ))}
              </div>
            )}

            {/* Editable table */}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary w-8">#</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Name</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Nationality</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">ID / Visa Number</th>
                  <th className="py-2 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {pendingBatch.passengers.map((p, idx) => {
                  const hasCheckDigitWarning = pendingBatch.warnings.some(
                    w => p.passport_number && w.includes(p.passport_number)
                  )
                  return (
                    <tr key={idx} className={`border-b border-border/50 ${hasCheckDigitWarning ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-2 px-2 text-xs text-text-secondary font-medium">{idx + 1}</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={p.full_name || ''}
                          onChange={e => updatePendingPassenger(idx, 'full_name', e.target.value)}
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Full name"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={p.nationality || ''}
                          onChange={e => updatePendingPassenger(idx, 'nationality', e.target.value)}
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Nationality"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={p.passport_number || p.visa_number || ''}
                            onChange={e => {
                              if (p.passport_number) {
                                updatePendingPassenger(idx, 'passport_number', e.target.value)
                              } else {
                                updatePendingPassenger(idx, 'visa_number', e.target.value)
                              }
                            }}
                            className={`w-full bg-background border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                              hasCheckDigitWarning ? 'border-amber-400' : 'border-border'
                            }`}
                            placeholder="Passport or Visa number"
                          />
                          {hasCheckDigitWarning && (
                            <span className="text-amber-600 text-xs font-bold flex-shrink-0" title="MRZ check-digit mismatch — verify manually">⚠</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => removePendingPassenger(idx)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Exclude this passenger"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Confirm / Cancel buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelBatch}
                className="px-4 py-2 bg-surface border border-border text-text-secondary rounded-md text-sm font-medium hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatch}
                className="px-4 py-2 bg-accent text-white rounded-md text-sm font-semibold hover:bg-accent/90"
              >
                Confirm All ({pendingBatch.passengers.length})
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {passengers.map((p, idx) => {
            if (p._removed) return null
            const isFirst = idx === 0 || !passengers.slice(0, idx).some(pp => !pp._removed)
            return (
              <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {activePassengers.indexOf(p) + 1}
                    </span>
                    {isFirst ? 'Primary Guest' : `Passenger ${activePassengers.indexOf(p) + 1}`}
                    {p.isNew && <span className="ml-1 px-1.5 py-0.5 bg-cyan-100 text-cyan-600 rounded text-[10px] font-bold">NEW</span>}
                  </span>
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={() => removePassenger(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Remove passenger"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name</label>
                    <input
                      value={p.full_name}
                      onChange={e => updatePassenger(idx, 'full_name', e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Nationality</label>
                    <input
                      value={p.nationality}
                      onChange={e => updatePassenger(idx, 'nationality', e.target.value)}
                      placeholder="e.g. Saudi"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">ID / Passport</label>
                    <input
                      value={p.passport_number}
                      onChange={e => updatePassenger(idx, 'passport_number', e.target.value)}
                      placeholder="Passport or ID number"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {activePassengers.length < 50 && (
          <button
            type="button"
            onClick={addPassenger}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50/50 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add another passenger
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {saving ? 'Saving...' : 'Save & Print'}
        </button>
        <Link href="/driver/trips" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center">
          Cancel
        </Link>
      </div>
    </div>
  )
}
