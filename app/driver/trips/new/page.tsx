'use client'

import { createTripAction } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { DocumentScannerUpload, type ExtractedData } from '@/components/driver/DocumentScannerUpload'

export default function NewDriverTripPage() {
  const [firstGuest, setFirstGuest] = useState({ name: '', nationality: '', id_number: '', contact: '', document_image_url: '' })
  const [passengers, setPassengers] = useState<{ name: string, nationality: string, id_number: string, document_image_url: string }[]>([])
  const [tripDate, setTripDate] = useState('')
  // Feature C: track which fields were auto-filled so we can show [Auto-filled] label
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  // Hide scanner after first successful extraction — keeps the form clean
  const [scannerVisible, setScannerVisible] = useState(true)

  // Calculate day of week based on date
  const dayOfTrip = tripDate ? new Date(tripDate).toLocaleDateString('en-US', { weekday: 'long' }) : ''

  const addPassenger = () => {
    if (passengers.length < 49) {
      setPassengers([...passengers, { name: '', nationality: '', id_number: '', document_image_url: '' }])
    }
  }

  const removeLastPassenger = () => {
    if (passengers.length > 0) {
      const newPassengers = [...passengers]
      newPassengers.pop()
      setPassengers(newPassengers)
    }
  }

  const updatePassenger = (index: number, field: 'name' | 'nationality' | 'id_number', value: string) => {
    const newPassengers = [...passengers]
    newPassengers[index][field] = value
    setPassengers(newPassengers)
    // Clear auto-filled marker when user manually edits the field
    setAutoFilled(prev => { const next = new Set(prev); next.delete(`p${index}_${field}`); return next })
  }

  // Fix #4: Wrapped in useCallback — stable reference prevents DocumentScannerUpload's
  // useEffect from re-firing and re-processing the same document
  const handleBatchScanSuccess = useCallback((data: ExtractedData) => {
    // Hide the scanner drop zone after first extraction
    setScannerVisible(false)
    setFirstGuest(prev => {
      // Fill primary guest first if empty
      if (!prev.name && !prev.id_number) {
        // Feature C: mark these fields as auto-filled
        setAutoFilled(af => new Set([...af, 'first_name', 'first_nationality', 'first_id']))
        return {
          ...prev,
          name: data.full_name || '',
          nationality: data.nationality || '',
          id_number: data.passport_number || data.visa_number || '',
          document_image_url: data.document_image_url || '',
        }
      }

      // Otherwise add as additional passenger
      setPassengers(curr => {
        const idx = curr.length
        // Feature C: mark new passenger fields as auto-filled
        setAutoFilled(af => new Set([...af, `p${idx}_name`, `p${idx}_nationality`, `p${idx}_id`]))
        return [
          ...curr,
          {
            name: data.full_name || '',
            nationality: data.nationality || '',
            id_number: data.passport_number || data.visa_number || '',
            document_image_url: data.document_image_url || '',
          },
        ]
      })
      return prev
    })
  }, [])

  const [savedTrip, setSavedTrip] = useState<{ message: string, tripId: string, tripNumber: number } | null>(null)

  const handleAction = async (formData: FormData) => {
    setSavedTrip(null)
    try {
      const result = await createTripAction(formData)
      if (result?.success) {
        setSavedTrip({ message: result.message, tripId: result.tripId, tripNumber: result.tripNumber })
        // Scroll to top to show success banner
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      throw error // Let Next.js handle redirects (for print action)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {savedTrip && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-base">{savedTrip.message}</p>
              <p className="text-emerald-600 text-sm">Your trip document has been saved to Trips History.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/driver/trips" className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors">
              View in History →
            </a>
            <a href={`/driver/trips/${savedTrip.tripId}/print`} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print
            </a>
          </div>
        </div>
      )}

      {/* Form Area */}
      <form action={handleAction} className="space-y-8">
        
        {/* Main Guest Info */}
        <div className="flex flex-col gap-2 mb-2">
          <h3 className="text-lg font-semibold text-text-secondary">Primary Guest Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">
              Name of the first guest
              {autoFilled.has('first_name') && <span className="ml-1 text-xs font-normal text-text-secondary">[Auto-filled — verify]</span>}
            </label>
            <input 
              type="text" 
              name="first_guest_name"
              required 
              value={firstGuest.name}
              onChange={e => { setFirstGuest({ ...firstGuest, name: e.target.value }); setAutoFilled(af => { const n = new Set(af); n.delete('first_name'); return n }) }}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="space-y-1 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">
              Nationality of the first guest
              {autoFilled.has('first_nationality') && <span className="ml-1 text-xs font-normal text-text-secondary">[Auto-filled — verify]</span>}
            </label>
            <input 
              type="text" 
              name="first_guest_nationality"
              required 
              value={firstGuest.nationality}
              onChange={e => { setFirstGuest({ ...firstGuest, nationality: e.target.value }); setAutoFilled(af => { const n = new Set(af); n.delete('first_nationality'); return n }) }}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="space-y-1 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">
              ID number of guest
              {autoFilled.has('first_id') && <span className="ml-1 text-xs font-normal text-text-secondary">[Auto-filled — verify]</span>}
            </label>
            <input 
              type="text" 
              name="first_guest_id"
              required 
              value={firstGuest.id_number}
              onChange={e => { setFirstGuest({ ...firstGuest, id_number: e.target.value }); setAutoFilled(af => { const n = new Set(af); n.delete('first_id'); return n }) }}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
        </div>

        {/* Contact & Location Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Contact number for first guest</label>
            <input 
              type="text" 
              name="first_guest_contact"
              value={firstGuest.contact}
              onChange={e => setFirstGuest({ ...firstGuest, contact: e.target.value })}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Coming from</label>
            <input 
              type="text" 
              name="pickup_location"
              required 
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Arrival to</label>
            <input 
              type="text" 
              name="dropoff_location"
              required 
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
        </div>

        {/* Date & Time Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Date</label>
            <input 
              type="date" 
              name="trip_date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              required 
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Day of the trip</label>
            <input 
              type="text" 
              value={dayOfTrip}
              readOnly
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-secondary outline-none text-right md:text-left"
            />
          </div>
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Arrival time</label>
            <input 
              type="time" 
              name="trip_time"
              required 
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-right md:text-left">
            <label className="text-sm font-medium text-text-secondary block">Trip duration</label>
            <input 
              type="text" 
              name="trip_duration"
              placeholder="e.g. 2 hours"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-right md:text-left"
            />
          </div>
          <div className="col-span-2 hidden md:block"></div>
        </div>



        {/* Passengers Data Section */}
        <div className="pt-16 pb-8 text-center space-y-6">
          <h3 className="text-lg font-semibold text-text-secondary">
            Passengers data (up to 50 passengers can be added)
          </h3>
          
          {scannerVisible ? (
            <div className="max-w-4xl mx-auto mb-8">
              <DocumentScannerUpload onBatchScanSuccess={handleBatchScanSuccess} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto mb-4 text-right">
              <button
                type="button"
                onClick={() => setScannerVisible(true)}
                className="text-sm text-accent hover:underline"
              >
                + Scan another document
              </button>
            </div>
          )}
          
          <div className="space-y-4 max-w-4xl mx-auto pt-4">
            {passengers.map((p, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Passenger {index + 2}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    {autoFilled.has(`p${index}_name`) && <p className="text-xs text-text-secondary">[Auto-filled — verify]</p>}
                    <input 
                      type="text" 
                      placeholder={`Passenger ${index + 2} Name`}
                      value={p.name}
                      onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    {autoFilled.has(`p${index}_nationality`) && <p className="text-xs text-text-secondary">[Auto-filled — verify]</p>}
                    <input 
                      type="text" 
                      placeholder={`Passenger ${index + 2} Nationality`}
                      value={p.nationality}
                      onChange={(e) => updatePassenger(index, 'nationality', e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    {autoFilled.has(`p${index}_id`) && <p className="text-xs text-text-secondary">[Auto-filled — verify]</p>}
                    <input 
                      type="text" 
                      placeholder={`Passenger ${index + 2} ID/Visa Number`}
                      value={p.id_number}
                      onChange={(e) => updatePassenger(index, 'id_number', e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center space-x-4 pt-6">
            <span className="text-sm text-text-secondary font-medium">
              Number of Passengers: {passengers.length + 1}
            </span>
            <button 
              type="button" 
              onClick={removeLastPassenger}
              disabled={passengers.length === 0}
              className="bg-amber-400 hover:bg-amber-500 text-amber-950 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove last passenger
            </button>
            <button 
              type="button" 
              onClick={addPassenger}
              className="bg-cyan-400 hover:bg-cyan-500 text-cyan-950 px-4 py-2 rounded-md font-medium text-sm transition-colors"
            >
              Add another passenger
            </button>
          </div>

          {/* Hidden fields: extra passengers + primary guest document_image_url for server action */}
          <input type="hidden" name="passengers_json" value={JSON.stringify(passengers)} />
          <input type="hidden" name="first_guest_document_image_url" value={firstGuest.document_image_url} />
        </div>

        {/* Form Submit Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-10 border-t border-border mt-8">
          <button 
            type="submit"
            name="action"
            value="save"
            className="w-full sm:w-auto bg-surface border-2 border-primary text-primary hover:bg-primary/10 px-8 py-3 rounded-md font-bold transition-colors shadow-sm"
          >
            Save Data
          </button>
          
          <button 
            type="submit"
            name="action"
            value="print"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Save & Print Document</span>
          </button>
        </div>
      </form>
    </div>
  )
}