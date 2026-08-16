-- Make vehicle registration fields optional so vehicles can be created
-- with just a plate number and filled in later by the admin.
ALTER TABLE public.vehicles
  ALTER COLUMN registration_number DROP NOT NULL,
  ALTER COLUMN registration_expiry DROP NOT NULL;
