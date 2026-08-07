# Project Specification
## Travel Document & Driver Management System

Prepared for: AI coding agent (Antigravity / Claude Code)
Purpose: Build a full-stack web platform for a ground transportation
company operating passenger routes across Jeddah, Makkah, and Madinah
(Saudi Arabia).

---

## 1. Project Summary

The system replaces manual document creation with a connected platform
where trips, drivers, vehicles, clients, and passengers are structured
records, and every legal/operational document is generated automatically
and consistently.

Two portals share one database:

- **Driver Portal**: drivers log in, create trips, fill daily vehicle
  inspections, view/print their own trip documents.
- **Admin Panel**: company-wide oversight — manage drivers, vehicles,
  clients, quotes, all trips, reports, and driver messaging.

The system must generate three official bilingual (Arabic RTL + English)
PDF documents per trip/booking, matching the company's existing
real-world document formats (described in Section 4).

---

## 2. Tech Stack (required)

- **Framework**: Next.js (React), using the App Router
- **Styling**: Tailwind CSS
- **Database**: Supabase (managed PostgreSQL)
- **Auth**: Supabase Auth (email/password for both Admin and Driver
  roles; role stored in a `profiles` table linked to `auth.users`)
- **File storage**: Supabase Storage (driver photos, uploaded ID/visa
  documents, generated PDF files)
- **Row Level Security (RLS)**: enabled on all tables. Drivers may only
  read/write their own trips, inspections, and profile. Admin role
  bypasses restrictions via a policy check on `profiles.role`.
- **PDF generation**: HTML template rendered to PDF via Puppeteer (use
  `@sparticuz/chromium` if deploying to a serverless environment such as
  Vercel, since full Puppeteer exceeds serverless size limits).
- **AI document scanning**: Claude API (vision-capable model). Send the
  uploaded document image, request a structured JSON response containing:
  full name, nationality, visa number, passport number, and expiry date
  if present. Extracted data must populate a review-before-save form —
  never write directly to the database without human confirmation.
- **Language**: TypeScript throughout (frontend, API routes, and any
  backend logic) for type safety with the database schema.

---

## 3. Core Data Model

Design as PostgreSQL tables (via Supabase). Use UUID primary keys.
Adjust types/constraints as needed for Supabase conventions.

**`clients`**
`id, name, contact_phone, contact_email, created_at`

**`bookings`**
`id, booking_number` (auto-incrementing, human-readable, e.g. 10793),
`client_id` (FK → clients), `created_at`

**`contracts`**
`id, booking_id` (FK → bookings), `party_two_name, route_from, route_to,
price, price_type` (cash | deferred), `trip_duration, contract_date,
cancellation_policy_text, created_at`

**`vehicles`**
`id, plate_number, vehicle_type, registration_number` (istimara),
`registration_expiry, created_at`

**`drivers`**
`id, auth_user_id` (FK → Supabase `auth.users`), `full_name, nationality,
mobile_number, residence_number` (iqama), `card_number, photo_url,
vehicle_id` (FK → vehicles, nullable), `status` (active | suspended),
`created_at`

**`passengers`**
`id, full_name, nationality, passport_number, visa_number,
document_image_url` (nullable), `created_at`
— reusable across bookings, not tied to a single trip

**`trips`**
`id, trip_number` (human-readable, e.g. 10876), `booking_id` (FK →
bookings, nullable — a trip can exist without a full contract for quick
entries), `driver_id` (FK → drivers), `vehicle_id` (FK → vehicles),
`pickup_location` (free text, e.g. "MAKKAH HOTEL"), `dropoff_location`
(free text, e.g. "JEDDAH AIRPORT"), `trip_date, trip_time, price,
price_type` (cash | deferred), `status` (scheduled | completed |
cancelled), `created_at`

**`trip_passengers`** (join table)
`id, trip_id` (FK → trips), `passenger_id` (FK → passengers), `seq_number`

**`vehicle_inspections`**
`id, vehicle_id` (FK → vehicles), `driver_id` (FK → drivers),
`inspection_date`

Dashboard indicators (each boolean sound/not-sound + notes text):
`fuel_indicator_ok, temp_indicator_ok, oil_pressure_ok,
check_engine_light_ok, abs_light_ok, warning_lights_ok`

External inspection:
`tires_pressure_ok, lights_front_rear_ok, warning_signals_ok,
glass_mirrors_ok, no_leaks_ok`

Safety equipment:
`fire_extinguisher_ok, warning_triangle_ok, first_aid_kit_ok,
glass_hammer_ok, seatbelts_ok`

Plus: `notes` (text, nullable), `driver_declaration_confirmed` (boolean),
`created_at`

**`quotes`**
`id, client_id` (FK → clients, nullable), `route_from, route_to,
estimated_price, status` (pending | converted | rejected), `created_at`

**`profiles`**
`id` (FK → `auth.users`), `role` (admin | driver), `full_name,
created_at`

**`documents`**
`id, document_type` (contract | manifest | inspection),
`document_number` (sequential, unique), `related_booking_id` (nullable),
`related_trip_id` (nullable), `related_inspection_id` (nullable),
`pdf_url` (Supabase Storage path), `issued_at`

**`messages`**
`id, sender_admin_id, recipient_driver_id` (nullable — null = broadcast
to all drivers), `body, sent_at`

---

## 4. Generated Documents (exact requirements)

All three documents must be rendered bilingually (Arabic RTL on the
primary text, English for names/route/vehicle data as shown in the real
samples), include the company logo, license number, and a stamp
placeholder graphic, and be produced as PDF via the HTML-to-PDF pipeline.

### Document 1 — Transport Contract (عقد نقل)
- Header: company logo, name, CR number, document title, date
- Fixed legal clause text (regulation article references — store as a
  template string, only variable fields are interpolated)
- Party 1: company name + license number (static/config value)
- Party 2: client name (from `contracts.party_two_name`)
- Route: from → to
- Trip duration, price, price type
- Cancellation/refund policy clause (fixed boilerplate text)
- Footer: signature/stamp area

### Document 2 — Driver & Passenger Manifest (بيانات السائق والركاب)
- Header: company name, license number, CR number
- Trip info: date, day-of-week (derive from date), time, route from/to
- Driver + vehicle row: plate number, vehicle type, driver card number,
  driver nationality, driver full name
- Passenger table: sequence number, passenger name, nationality
- Total passenger count
- Liability disclaimer text (fixed boilerplate)
- Contact number (config value), booking number

### Document 3 — Daily Vehicle Inspection Checklist (سجل الفحص اليومي)
- Header: company name, vehicle plate, date, driver name
- Section 1 – Dashboard indicators: each item as sound (✓) / not sound
  (—) / notes, per field in `vehicle_inspections`
- Section 2 – External inspection: same format
- Section 3 – Safety equipment: same format
- Driver declaration text + signature/stamp area

---

## 5. Feature List by Module

**Auth**
- Admin login
- Driver login (created only by admin, drivers cannot self-register)
- Role-based route protection (middleware checks `profiles.role`)

**Driver Management** (Admin only)
- Create new driver: full_name, nationality, mobile_number,
  residence_number, card_number, vehicle assignment, photo upload,
  password (creates a Supabase Auth user + `profiles` + `drivers` row)
- List/search drivers by name or vehicle
- Activate/suspend driver accounts
- Show total driver count

**Vehicle Management** (Admin only)
- CRUD vehicles: plate, type, registration number, expiry

**Client Management** (Admin only)
- CRUD clients: name, contact info, view booking history per client

**Passenger Management**
- Create/search reusable passenger records
- AI document scanner: upload a photo of passport/visa/iqama, call the
  Claude API with vision, extract `{full_name, nationality, visa_number,
  passport_number, expiry_date}`, pre-fill the passenger form fields,
  require explicit user confirmation before saving to the database

**Quotes**
- Create a quote (client, route, estimated price)
- Convert a quote into a booking (one action, carries data forward)

**Booking & Trip Engine**
- Create booking (auto-generated sequential `booking_number`)
- Create contract under a booking (auto-fills company/license fields,
  only requires client name, route, price, duration)
- Create trip under a booking: driver select, vehicle select (or
  auto-fill vehicle from driver's assigned vehicle), date/time,
  pickup/dropoff free text, passenger list (add existing or create new)
- "Duplicate this trip" action: clones all fields of a selected trip
  into a new trip form, only date/time need changing
- Edit / delete trip
- Trip list view with filters: by date, by driver, by route, by status

**Document Generation**
- Generate Contract PDF from a booking's contract data
- Generate Manifest PDF from a trip's data
- Generate Inspection PDF from a `vehicle_inspections` row
- All PDFs auto-numbered, stored in Supabase Storage, listed under the
  `documents` table with links back to their source records

**Daily Vehicle Inspection** (driver-facing)
- Mobile-friendly checklist form (dashboard/external/safety sections)
- Submit → creates `vehicle_inspections` row → generates PDF
- One inspection expected per vehicle per day (soft validation warning
  if a duplicate is attempted, not a hard block)

**Admin Dashboard**

KPI cards required: total drivers, active drivers, trips today, total
trips, revenue today, total revenue, open requests, orders today, unread
messages/alerts, 7-day upcoming trip schedule, reminders.

Reminder creation (simple text + date, tied to a booking or standalone).

**Reporting**
- Trip report/export module: filter by date range/driver/route, export
  to Excel (xlsx) — reuse existing spreadsheet column structure from the
  company's current workflow (vehicle expenses, personal expenses,
  received funds kept as distinct categories) if extending into
  financial reporting later

**Messaging**
- Admin composes a message to a single driver or broadcasts to all
- Drivers see messages in their portal (read/unread state)

---

## 6. UX Notes Carried Over From the Existing System

- Pickup/dropoff are free-text location names (hotel/airport level
  detail), not just city selection — do not restrict to a fixed city
  dropdown.
- Trip cards in the admin trip list must support: Delete, Edit, Print,
  and "New trip with same data" (duplicate).
- Vehicle info can be assigned directly during driver creation for
  speed, but must remain a proper foreign key relation to the `vehicles`
  table (not duplicated free-text fields) so fleet-level reporting works
  later.
- Documents must always show correct day-of-week text derived from the
  trip date (the source system displays this, e.g. "الجمعة" for Friday).

---

## 7. Security Requirements

- All sensitive fields (`visa_number`, `passport_number`,
  `residence_number`) must be protected by Supabase RLS so only Admin
  role and the relevant driver (for their own assigned trips) can read
  them.
- HTTPS enforced everywhere (default on Vercel/Supabase).
- Rate limit login attempts.
- Uploaded document images (for AI scanning) stored in a private
  Storage bucket, never public.
- AI-extracted passenger data must pass through a human confirmation
  step before being persisted — never auto-save directly from the AI
  response.

---

## 8. Build Order (recommended phases)

**Phase 0 — Project scaffold**
Next.js + Tailwind + Supabase project setup, environment variables, base
folder structure, Supabase schema migration covering all tables in
Section 3, RLS policies stubbed in.

**Phase 1 — Auth**
Supabase Auth wiring, `profiles` table + role logic, admin login page,
driver login page, route protection middleware.

**Phase 2 — Master data**
Vehicles CRUD, Drivers CRUD (with photo upload to Storage), Clients
CRUD, Passengers CRUD including the AI document scanner upload + Claude
API extraction + review-before-save flow.

**Phase 3 — Quotes**
Quote form, list, convert-to-booking action.

**Phase 4 — Booking & Trip engine**
Booking creation with auto-numbering, contract creation, trip creation
form, duplicate-trip action, trip list with filters and card actions
(edit/delete/print/duplicate).

**Phase 5 — Document generation**
Build the three HTML templates exactly per Section 4, wire up Puppeteer
rendering, auto-numbering, Storage upload, `documents` table linkage.

**Phase 6 — Daily vehicle inspection**
Driver-facing checklist form, submit handler, PDF generation reusing the
Phase 5 pipeline.

**Phase 7 — Admin dashboard**
KPI queries and cards, 7-day schedule view, reminders feature.

**Phase 8 — Reporting & messaging**
Excel export module, admin messaging (single + broadcast), driver-side
message inbox.

**Phase 9 — Security hardening**
Finalize RLS policies, rate limiting, input validation, verify no
sensitive field is readable cross-role.

**Phase 10 — Deployment**
Production Supabase project, environment config, Vercel (or equivalent)
deployment, Puppeteer/Chromium serverless compatibility check, final QA
with real sample data, go-live.

---

## 9. Project Folder Structure

This is the required Next.js App Router layout. Scaffold exactly this
structure in Phase 0 rather than improvising a different one. Route
groups `(admin)`, `(driver)`, and `(auth)` keep the two portals
logically separate while sharing one app and one `middleware.ts` for
role-based access.

```
kashaf/
├── AGENTS.md
├── docs/
│   └── specs/
│       ├── project-spec.md
│       └── design.md
│
├── app/
│   ├── layout.tsx                     # root layout, font, global providers
│   ├── globals.css                    # Tailwind base + theme
│   │
│   ├── (auth)/                        # public, unauthenticated
│   │   └── login/
│   │       └── page.tsx               # single login page, role-aware redirect after auth
│   │
│   ├── (admin)/                       # admin-only, protected by middleware
│   │   ├── layout.tsx                 # admin nav shell (Control Panel, Trips, etc.)
│   │   ├── dashboard/
│   │   │   └── page.tsx               # KPI cards, 7-day schedule, reminders
│   │   ├── drivers/
│   │   │   ├── page.tsx               # driver list + search
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # new driver form
│   │   │   └── [driverId]/
│   │   │       └── page.tsx           # edit driver / suspend / view assigned vehicle
│   │   ├── vehicles/
│   │   │   ├── page.tsx
│   │   │   └── [vehicleId]/
│   │   │       └── page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [clientId]/
│   │   │       └── page.tsx           # client profile + booking history
│   │   ├── passengers/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx           # includes AI document scanner upload
│   │   ├── quotes/
│   │   │   ├── page.tsx
│   │   │   └── [quoteId]/
│   │   │       └── page.tsx           # convert-to-booking action
│   │   ├── bookings/
│   │   │   ├── page.tsx
│   │   │   └── [bookingId]/
│   │   │       └── page.tsx           # booking detail, contract, linked trips
│   │   ├── trips/
│   │   │   ├── page.tsx               # filterable trip list, card actions
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [tripId]/
│   │   │       └── page.tsx           # edit trip / view generated documents
│   │   ├── inspections/
│   │   │   └── page.tsx               # admin view of all daily inspections
│   │   ├── reports/
│   │   │   └── page.tsx               # trip report + Excel export
│   │   └── messages/
│   │       └── page.tsx               # compose / broadcast to drivers
│   │
│   ├── (driver)/                      # driver-only, protected by middleware
│   │   ├── layout.tsx                 # driver nav shell (simpler, mobile-first)
│   │   ├── trips/
│   │   │   ├── page.tsx               # driver's own trips
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # create trip (+ duplicate-from action)
│   │   │   └── [tripId]/
│   │   │       └── page.tsx           # view / print own trip documents
│   │   ├── inspection/
│   │   │   └── page.tsx               # daily vehicle inspection form
│   │   ├── account/
│   │   │   └── page.tsx               # own profile, assigned vehicle
│   │   └── messages/
│   │       └── page.tsx               # inbox, read/unread
│   │
│   └── api/
│       ├── documents/
│       │   ├── contract/route.ts      # generate Contract PDF
│       │   ├── manifest/route.ts      # generate Manifest PDF
│       │   └── inspection/route.ts    # generate Inspection PDF
│       ├── scan-document/
│       │   └── route.ts               # Claude vision call, returns extracted fields
│       └── reports/
│           └── export/route.ts        # Excel export endpoint
│
├── components/
│   ├── ui/                            # design-system primitives only
│   │   ├── PrimaryButton.tsx
│   │   ├── SecondaryButton.tsx
│   │   ├── DestructiveButton.tsx
│   │   ├── Card.tsx
│   │   ├── PageLayout.tsx
│   │   └── Typography.tsx
│   ├── admin/                         # admin-specific composed components
│   │   ├── KpiCard.tsx
│   │   ├── DriverForm.tsx
│   │   ├── TripCard.tsx
│   │   └── AdminNav.tsx
│   └── driver/                        # driver-specific composed components
│       ├── DriverNav.tsx
│       ├── TripForm.tsx
│       ├── InspectionChecklist.tsx
│       └── DocumentScannerUpload.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # browser client
│   │   ├── server.ts                  # server component / route handler client
│   │   └── middleware.ts              # session refresh helper
│   ├── pdf/
│   │   ├── render.ts                  # Puppeteer render wrapper
│   │   ├── templates/
│   │   │   ├── contract.tsx
│   │   │   ├── manifest.tsx
│   │   │   └── inspection.tsx
│   │   └── numbering.ts               # sequential document numbering
│   ├── ai/
│   │   └── extractDocument.ts         # Claude vision call for the scanner
│   └── utils/
│       ├── auth.ts                    # role checks, session helpers
│       └── format.ts                  # date/day-of-week, currency formatting
│
├── types/
│   └── database.ts                    # generated/hand-written Supabase types
│
├── supabase/
│   └── migrations/
│       └── 0001_init.sql              # full schema from Section 3 above
│
├── middleware.ts                      # route protection: (admin) vs (driver) vs (auth)
├── tailwind.config.ts                 # theme colors from design.md
├── .env.local.example
└── package.json
```

---

## 10. Open Configuration Values (fill before build)

- Company name, CR (commercial registration) number, license number
- Company logo file
- Company stamp image (for PDF footer placement)
- Fixed legal clause text for the transport contract
- Cancellation/refund policy exact wording
- Support/contact phone number shown on documents
- Document numbering start value (to continue from existing sequence if
  migrating from the current system, e.g. continue after 10882)
