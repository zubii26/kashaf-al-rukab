'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthenticatedDriver } from '@/lib/utils/auth'

export async function submitInspectionAction(formData: FormData) {
  const supabase = await createClient()

  // Use cached auth — deduplicates getUser() within this request
  const driverAuth = await getAuthenticatedDriver()
  if (!driverAuth) throw new Error('Not authenticated')

  const driver = { id: driverAuth.driverId, vehicle_id: driverAuth.vehicleId }

  if (!driver.vehicle_id) throw new Error('No vehicle assigned to driver')

  const getBool = (key: string) => formData.get(key) === 'ok'

  const { data: inspection, error } = await supabase
    .from('vehicle_inspections')
    .insert({
      driver_id: driver.id,
      vehicle_id: driver.vehicle_id,
      inspection_date: new Date().toISOString().split('T')[0],
      // Dashboard
      fuel_indicator_ok: getBool('fuel_indicator_ok'),
      temp_indicator_ok: getBool('temp_indicator_ok'),
      oil_pressure_ok: getBool('oil_pressure_ok'),
      check_engine_light_ok: getBool('check_engine_light_ok'),
      abs_light_ok: getBool('abs_light_ok'),
      warning_lights_ok: getBool('warning_lights_ok'),
      // External
      tires_pressure_ok: getBool('tires_pressure_ok'),
      lights_front_rear_ok: getBool('lights_front_rear_ok'),
      warning_signals_ok: getBool('warning_signals_ok'),
      glass_mirrors_ok: getBool('glass_mirrors_ok'),
      no_leaks_ok: getBool('no_leaks_ok'),
      // Safety
      fire_extinguisher_ok: getBool('fire_extinguisher_ok'),
      warning_triangle_ok: getBool('warning_triangle_ok'),
      first_aid_kit_ok: getBool('first_aid_kit_ok'),
      glass_hammer_ok: getBool('glass_hammer_ok'),
      seatbelts_ok: getBool('seatbelts_ok'),
      notes: (formData.get('notes') as string) || null,
      driver_declaration_confirmed: formData.get('driver_declaration_confirmed') === 'true',
    })
    .select()
    .single()

  if (error || !inspection) throw new Error(error?.message || 'Failed to save inspection')

  redirect(`/driver/inspection/${inspection.id}/print`)
}
