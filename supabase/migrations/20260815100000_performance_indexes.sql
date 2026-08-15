-- Performance Indexes Migration
-- Adds missing indexes on all high-frequency query columns.
-- Without these, every filter/sort does a full table scan.

-- trips: most queried table
CREATE INDEX IF NOT EXISTS idx_trips_driver_id       ON public.trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_date       ON public.trips (trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status          ON public.trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at      ON public.trips (created_at DESC);
-- Compound: driver dashboard query (driver_id + created_at)
CREATE INDEX IF NOT EXISTS idx_trips_driver_created  ON public.trips (driver_id, created_at DESC);
-- Compound: dashboard upcoming trips (status + trip_date range)
CREATE INDEX IF NOT EXISTS idx_trips_status_date     ON public.trips (status, trip_date);

-- trip_passengers: fetched on every print page and trips list
CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip_id ON public.trip_passengers (trip_id);

-- drivers: auth lookup on every driver page load
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id  ON public.drivers (auth_user_id);

-- messages: unread count on dashboard
CREATE INDEX IF NOT EXISTS idx_messages_read_at      ON public.messages (read_at) WHERE read_at IS NULL;

-- reminders: pending reminders on dashboard
CREATE INDEX IF NOT EXISTS idx_reminders_is_done     ON public.reminders (is_done, due_date) WHERE is_done = false;

-- passengers: looked up via trip_passengers join
CREATE INDEX IF NOT EXISTS idx_passengers_id         ON public.passengers (id);
