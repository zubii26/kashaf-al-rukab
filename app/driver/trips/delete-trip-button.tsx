'use client'

import { deleteTripAction } from './actions'

export default function DeleteTripButton({ tripId }: { tripId: string }) {
  return (
    <form action={deleteTripAction}>
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        type="submit"
        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all text-xs font-semibold shadow-sm"
        onClick={(e) => {
          if (!confirm('Are you sure you want to delete this trip?')) {
            e.preventDefault()
          }
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete</span>
      </button>
    </form>
  )
}
