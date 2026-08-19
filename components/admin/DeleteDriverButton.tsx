'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { DestructiveButton, SecondaryButton } from '@/components/ui/button'
import { deleteDriver } from '@/app/admin/drivers/actions'

interface DeleteDriverButtonProps {
  driverId: string
  driverName: string
}

export default function DeleteDriverButton({ driverId, driverName }: DeleteDriverButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteDriver(driverId)
      if ('error' in result) {
        setError(result.error)
        setConfirming(false)
      } else {
        router.push('/admin/drivers')
      }
    })
  }

  if (!confirming) {
    return (
      <DestructiveButton
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <Trash2 size={15} />
        Delete Driver Account
      </DestructiveButton>
    )
  }

  return (
    <div className="rounded-md border border-danger/40 bg-danger/5 p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-start gap-2 text-danger">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Are you sure you want to delete this driver?</p>
          <p className="text-xs text-text-secondary mt-0.5">
            This will permanently remove <strong>{driverName}</strong>&apos;s account, profile and login access.
            Trips already recorded will <strong>not</strong> be deleted.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <DestructiveButton
          type="button"
          onClick={handleDelete}
          isLoading={isPending}
          loadingText="Deleting..."
          className="text-sm whitespace-nowrap"
        >
          Yes, Delete Permanently
        </DestructiveButton>
        <SecondaryButton
          type="button"
          onClick={() => { setConfirming(false); setError(null) }}
          disabled={isPending}
          className="text-sm"
        >
          Cancel
        </SecondaryButton>
      </div>
    </div>
  )
}