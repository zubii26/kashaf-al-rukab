-- Performance Indexes Migration
-- Uses IF NOT EXISTS and conditional blocks to be safe regardless of migration order.

-- trips: most queried table
CREATE INDEX IF NOT EXISTS idx_trips_driver_id      ON public.trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_date      ON public.trips (trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status         ON public.trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at     ON public.trips (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_driver_created ON public.trips (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status_date    ON public.trips (status, trip_date);

-- trip_passengers
CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip_id ON public.trip_passengers (trip_id);

-- drivers
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON public.drivers (auth_user_id);

-- messages: ensure read_at column exists first, then index it
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_messages_read_at     ON public.messages (read_at) WHERE read_at IS NULL;

-- reminders (only if table exists — created in a later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminders') THEN
    CREATE INDEX IF NOT EXISTS idx_reminders_is_done ON public.reminders (is_done, due_date) WHERE is_done = false;
  END IF;
END $$;
