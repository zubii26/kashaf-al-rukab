-- 1. Create custom types
CREATE TYPE booking_price_type AS ENUM ('cash', 'deferred');
CREATE TYPE trip_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE driver_status AS ENUM ('active', 'suspended');
CREATE TYPE quote_status AS ENUM ('pending', 'converted', 'rejected');
CREATE TYPE user_role AS ENUM ('admin', 'driver');
CREATE TYPE document_type_enum AS ENUM ('contract', 'manifest', 'inspection');

-- 2. Create tables
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number SERIAL NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    party_two_name TEXT NOT NULL,
    route_from TEXT NOT NULL,
    route_to TEXT NOT NULL,
    price NUMERIC NOT NULL,
    price_type booking_price_type NOT NULL,
    trip_duration TEXT,
    contract_date DATE NOT NULL,
    cancellation_policy_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    registration_expiry DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    residence_number TEXT NOT NULL,
    card_number TEXT NOT NULL,
    photo_url TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    status driver_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    passport_number TEXT,
    visa_number TEXT,
    document_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number SERIAL NOT NULL UNIQUE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    trip_date DATE NOT NULL,
    trip_time TIME NOT NULL,
    price NUMERIC NOT NULL,
    price_type booking_price_type NOT NULL,
    status trip_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trip_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
    seq_number INTEGER NOT NULL,
    UNIQUE(trip_id, passenger_id)
);

CREATE TABLE public.vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Dashboard indicators
    fuel_indicator_ok BOOLEAN NOT NULL,
    temp_indicator_ok BOOLEAN NOT NULL,
    oil_pressure_ok BOOLEAN NOT NULL,
    check_engine_light_ok BOOLEAN NOT NULL,
    abs_light_ok BOOLEAN NOT NULL,
    warning_lights_ok BOOLEAN NOT NULL,
    -- External inspection
    tires_pressure_ok BOOLEAN NOT NULL,
    lights_front_rear_ok BOOLEAN NOT NULL,
    warning_signals_ok BOOLEAN NOT NULL,
    glass_mirrors_ok BOOLEAN NOT NULL,
    no_leaks_ok BOOLEAN NOT NULL,
    -- Safety equipment
    fire_extinguisher_ok BOOLEAN NOT NULL,
    warning_triangle_ok BOOLEAN NOT NULL,
    first_aid_kit_ok BOOLEAN NOT NULL,
    glass_hammer_ok BOOLEAN NOT NULL,
    seatbelts_ok BOOLEAN NOT NULL,
    
    notes TEXT,
    driver_declaration_confirmed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    route_from TEXT NOT NULL,
    route_to TEXT NOT NULL,
    estimated_price NUMERIC NOT NULL,
    status quote_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type document_type_enum NOT NULL,
    document_number SERIAL NOT NULL UNIQUE,
    related_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    related_trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    related_inspection_id UUID REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    recipient_driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security (RLS)

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Basic stub policies (TODO: refine in Phase 1 when auth is fully wired up)

-- Admin has full access to everything
CREATE POLICY admin_all ON public.clients FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.bookings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.contracts FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.vehicles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.drivers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.passengers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.trips FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.trip_passengers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.vehicle_inspections FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.quotes FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.documents FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all ON public.messages FOR ALL TO authenticated USING (public.is_admin());

-- Driver restricted access stubs
-- Drivers can read their own profile
CREATE POLICY driver_read_profile ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY driver_update_profile ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Drivers can read their own driver record
CREATE POLICY driver_read_self ON public.drivers FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- Drivers can read/write their own trips
CREATE POLICY driver_trips_select ON public.trips FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));
CREATE POLICY driver_trips_update ON public.trips FOR UPDATE TO authenticated USING (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));
CREATE POLICY driver_trips_insert ON public.trips FOR INSERT TO authenticated WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));

-- Drivers can read/write their own vehicle inspections
CREATE POLICY driver_inspections_select ON public.vehicle_inspections FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));
CREATE POLICY driver_inspections_insert ON public.vehicle_inspections FOR INSERT TO authenticated WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));

-- Drivers can read their assigned vehicle
CREATE POLICY driver_read_vehicle ON public.vehicles FOR SELECT TO authenticated USING (id IN (SELECT vehicle_id FROM public.drivers WHERE auth_user_id = auth.uid()));

-- Drivers can read documents related to their trips or inspections
CREATE POLICY driver_read_documents ON public.documents FOR SELECT TO authenticated USING (
    related_trip_id IN (SELECT id FROM public.trips WHERE driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()))
    OR related_inspection_id IN (SELECT id FROM public.vehicle_inspections WHERE driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()))
);

-- Drivers can read messages sent to them (or broadcast where recipient_driver_id is null)
CREATE POLICY driver_read_messages ON public.messages FOR SELECT TO authenticated USING (
    recipient_driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()) OR recipient_driver_id IS NULL
);
