-- Allow drivers to read passengers linked to their own trips
CREATE POLICY driver_read_trip_passengers ON public.trip_passengers
  FOR SELECT TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE driver_id IN (
        SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Allow drivers to insert passengers into their own trips
CREATE POLICY driver_insert_trip_passengers ON public.trip_passengers
  FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE driver_id IN (
        SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Allow drivers to read passengers linked to their own trips
CREATE POLICY driver_read_passengers ON public.passengers
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT passenger_id FROM public.trip_passengers
      WHERE trip_id IN (
        SELECT id FROM public.trips
        WHERE driver_id IN (
          SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Allow drivers to insert new passengers
CREATE POLICY driver_insert_passengers ON public.passengers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow drivers to update passengers on their own trips
CREATE POLICY driver_update_passengers ON public.passengers
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT passenger_id FROM public.trip_passengers
      WHERE trip_id IN (
        SELECT id FROM public.trips
        WHERE driver_id IN (
          SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
        )
      )
    )
  );
