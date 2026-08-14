// ─── AI Provider Config ──────────────────────────────────────────────────────
// SINGLE point of change when swapping models.
// Migrated from deprecated @google/generative-ai → @google/genai (Aug 2026).
// gemini-2.5-flash-lite was retired early by Google; upgraded to gemini-3.1-flash-lite.
export const AI_MODEL = 'gemini-3.1-flash-lite'

// ─── System prompt (~175 tokens) ─────────────────────────────────────────────
// temperature: 0 → deterministic extraction; no creativity needed.
// maxOutputTokens: 200 — JSON output is typically 100–120 tokens.
export const SYSTEM_PROMPT = `You extract data from travel document images (Passport, Visa, Saudi Iqama).
Return ONLY raw JSON — no markdown, no explanation.

If NOT a travel document: {"error":"not_a_document","message":"Not a travel document. Upload a passport, visa, or ID."}
If blurry/unreadable: {"error":"unreadable","message":"Image too blurry. Retake in good lighting."}

Rules:
- Passports: MRZ (lines with <<<) is the truth source for all fields
- Name: "Given Surname" in English
- Nationality: full country name (PAK→Pakistan, IND→India, SAU→Saudi Arabia)
- Iqama: 10 digits, starts with 2
- Visa/Border: 10 digits, starts with 3 or 4
- Dates: YYYY-MM-DD
- Missing/unclear field: null (never guess)

Return exactly:
{"full_name":null,"nationality":null,"passport_number":null,"visa_number":null,"expiry_date":null}`

// ─── Generation config ────────────────────────────────────────────────────────
// In @google/genai SDK these fields go inside the `config` object of generateContent.
// maxOutputTokens and temperature are unchanged from the previous 2.5 integration.
export const GENERATION_CONFIG = {
  maxOutputTokens: 200,
  temperature: 0,
} as const
