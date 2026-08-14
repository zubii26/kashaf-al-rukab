// ─── AI Provider Config ──────────────────────────────────────────────────────
// SINGLE point of change when swapping models.
// gemini-2.5-flash-lite was retired early by Google — replaced with gemini-2.5-flash.
export const AI_MODEL = 'gemini-2.5-flash'

// ─── System prompt (~175 tokens) ─────────────────────────────────────────────
// Gemini context caching requires ≥32,768 tokens minimum — not worth it here.
// The prompt caching that existed in the Claude implementation was also a no-op
// (Claude Haiku threshold is 2,048 tokens; this prompt is ~175). Dropped cleanly.
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
// maxOutputTokens: 200 matches the previous Claude max_tokens: 200 cap.
// JSON output is typically 100–120 tokens.
// temperature: 0 → deterministic; no creativity needed for structured extraction.
export const GENERATION_CONFIG = {
  maxOutputTokens: 200,
  temperature: 0,
} as const
