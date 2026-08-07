-- Company settings: singleton row storing name, logo, stamp, CR, license, phone
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name_ar TEXT NOT NULL DEFAULT 'كشاف الركاب للنقل',
  name_en TEXT NOT NULL DEFAULT 'Kashaf Al Rukab Transport',
  license_number TEXT NOT NULL DEFAULT '',
  cr_number TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  stamp_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON public.company_settings FOR ALL TO authenticated USING (public.is_admin());
-- Also allow public read so print pages (server components) can load settings
CREATE POLICY allow_read ON public.company_settings FOR SELECT USING (true);

-- Seed the default row
INSERT INTO public.company_settings (id, name_ar, name_en)
VALUES ('default', 'كشاف الركاب للنقل', 'Kashaf Al Rukab Transport')
ON CONFLICT (id) DO NOTHING;

-- Reminders: standalone text reminders optionally tied to a booking
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  due_date DATE,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON public.reminders FOR ALL TO authenticated USING (public.is_admin());

-- Add read_at to messages for unread tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
