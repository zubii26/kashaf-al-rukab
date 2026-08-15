-- Auto-delete trips older than 4 days for drivers
-- Uses pg_cron to run a cleanup job every day at midnight (UTC)

-- Step 1: Enable pg_cron extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Create a function that deletes trips older than 4 days
-- (trip_passengers are cascade-deleted automatically via FK)
CREATE OR REPLACE FUNCTION public.delete_old_driver_trips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.trips
  WHERE created_at < NOW() - INTERVAL '4 days';
END;
$$;

-- Step 4: Schedule the job — runs every day at 00:00 UTC
SELECT cron.schedule(
  'delete-old-driver-trips',       -- job name (unique)
  '0 0 * * *',                     -- cron: daily at midnight UTC
  'SELECT public.delete_old_driver_trips()'
);
