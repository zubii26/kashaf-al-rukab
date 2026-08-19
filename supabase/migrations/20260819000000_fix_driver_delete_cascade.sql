-- Fix driver deletion: change ON DELETE RESTRICT → ON DELETE SET NULL
-- for trips and vehicle_inspections so that deleting a driver is never
-- blocked by FK constraints. Historical trips/inspections are preserved
-- with driver_id set to NULL — matching the UI copy:
--   "Trips already recorded will not be deleted."
--
-- Root cause: trips.driver_id and vehicle_inspections.driver_id both had
-- ON DELETE RESTRICT, which aborted the entire auth.users → profiles → drivers
-- cascade whenever the driver had any recorded trips or inspections.
--
-- Additionally, both columns were NOT NULL, which would have rejected the
-- SET NULL behaviour even after changing the FK action. Both constraints
-- are relaxed here together.

-- ── trips.driver_id ──────────────────────────────────────────────────────────

-- 1a. Drop NOT NULL constraint (required before SET NULL FK can fire)
ALTER TABLE public.trips
  ALTER COLUMN driver_id DROP NOT NULL;

-- 1b. Replace RESTRICT FK with SET NULL FK
ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_driver_id_fkey
  FOREIGN KEY (driver_id)
  REFERENCES public.drivers(id)
  ON DELETE SET NULL;

-- ── vehicle_inspections.driver_id ────────────────────────────────────────────

-- 2a. Drop NOT NULL constraint
ALTER TABLE public.vehicle_inspections
  ALTER COLUMN driver_id DROP NOT NULL;

-- 2b. Replace RESTRICT FK with SET NULL FK
ALTER TABLE public.vehicle_inspections
  DROP CONSTRAINT IF EXISTS vehicle_inspections_driver_id_fkey;

ALTER TABLE public.vehicle_inspections
  ADD CONSTRAINT vehicle_inspections_driver_id_fkey
  FOREIGN KEY (driver_id)
  REFERENCES public.drivers(id)
  ON DELETE SET NULL;
