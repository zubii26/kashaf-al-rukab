import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import NewDriverForm from './NewDriverForm'

export default async function NewDriverPage() {
  const supabase = await createClient()
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, vehicle_type')
    .order('plate_number')

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Add Driver</h1>
        </div>
        <NewDriverForm vehicles={vehicles} />
      </div>
    </PageLayout>
  )
}