# AGENTS.md

## Project
Travel Document & Driver Management System — a full-stack platform for a
ground transportation company operating passenger routes across Jeddah,
Makkah, and Madinah (Saudi Arabia).

**Before starting any task, read the full specification at:**
`docs/specs/project-spec.md`

That document contains the complete database schema, the exact bilingual
PDF document requirements, the full feature list by module, and the
recommended build order. Do not guess at schema fields or document
layout — they are fully specified there.

**For any UI work, also read:** `docs/specs/design.md`

That document defines the exact color palette, icon set, button system,
typography, and layout rules — including keeping the DOM/component
structure minimal and avoiding unnecessary wrapper containers. Apply it
to every screen — no new colors, icon styles, button variants, or extra
nested containers outside what it defines, and no animation or motion
effects anywhere in the UI.

## Tech Stack
- Framework: Next.js (App Router), TypeScript throughout
- Styling: Tailwind CSS
- Database: Supabase (managed PostgreSQL)
- Auth: Supabase Auth (roles: admin, driver — stored in `profiles.role`)
- Storage: Supabase Storage (driver photos, uploaded ID/visa images, PDFs)
- PDF generation: HTML template rendered via Puppeteer
  (use `@sparticuz/chromium` if deploying serverless)
- AI document scanning: Claude API (vision) — extracts passenger/driver
  fields from an uploaded document image

## Critical Rules
1. Never modify the database schema without confirming against Section 3
   of `docs/specs/project-spec.md`.
2. Row Level Security (RLS) must be enabled on every table. A driver may
   only read/write their own trips, inspections, and profile.
3. AI-extracted passenger/driver data (name, nationality, visa number,
   passport number) must always pass through an explicit human
   confirmation step before being saved — never write it to the database
   directly from the AI response.
4. All three generated PDF documents (Transport Contract, Driver &
   Passenger Manifest, Daily Vehicle Inspection) must match the exact
   layout and field requirements in Section 4 of the spec — including
   bilingual Arabic RTL + English rendering, company logo, and stamp
   placeholder.
5. Sensitive fields (visa_number, passport_number, residence_number)
   must never be exposed outside of Admin role and the relevant driver's
   own assigned trips.
6. Follow the build order in Section 8 of the spec (Phase 0 through
   Phase 10) rather than building features out of sequence.

## Preferences
- Tailwind for all styling — no separate CSS files unless unavoidable
- Prefer Server Components and Server Actions where practical
- Keep all sensitive company configuration (CR number, license number,
  legal clause text, stamp image) in a single config file, not hardcoded
  across templates — see Section 9 of the spec for the full list
