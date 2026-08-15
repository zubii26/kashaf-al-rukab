// ─── ICAO 9303 MRZ Check-Digit Validation ────────────────────────────────────
// Implements the modulus-10 weighted check-digit algorithm used in machine-
// readable travel documents (passports, visas).
//
// Reference: ICAO Doc 9303, Part 3, Section 4.9
// Weights cycle: 7, 3, 1, 7, 3, 1, …
// Character values: 0-9 → 0-9, A-Z → 10-35, < → 0
//
// This runs server-side after the AI returns extracted data. A failed check
// digit does NOT reject the passenger — it adds a warning for manual review.

const MRZ_WEIGHTS = [7, 3, 1] as const

/** Map a single MRZ character to its numeric value. */
function charValue(ch: string): number {
  if (ch === '<' || ch === ' ') return 0
  const code = ch.charCodeAt(0)
  // 0-9
  if (code >= 48 && code <= 57) return code - 48
  // A-Z
  if (code >= 65 && code <= 90) return code - 55
  // a-z (normalise to uppercase)
  if (code >= 97 && code <= 122) return code - 87
  return 0 // unknown char treated as filler
}

/**
 * Compute the ICAO 9303 check digit for a string.
 * @returns The expected check digit (0-9).
 */
export function computeCheckDigit(input: string): number {
  let sum = 0
  for (let i = 0; i < input.length; i++) {
    sum += charValue(input[i]) * MRZ_WEIGHTS[i % 3]
  }
  return sum % 10
}

/**
 * Validate a passport number against its MRZ check digit.
 *
 * @param passportNumber - The passport number string (from the AI extraction).
 * @param checkDigit     - The single check-digit character that follows the
 *                         passport number in the MRZ line. If not available
 *                         (i.e. the AI didn't extract it), returns null
 *                         meaning "cannot validate".
 * @returns `true` if valid, `false` if mismatch, `null` if check digit was
 *          not provided and validation is impossible.
 */
export function validatePassportCheckDigit(
  passportNumber: string,
  checkDigit?: string | null,
): boolean | null {
  if (!passportNumber || !checkDigit) return null

  const expectedDigit = checkDigit.trim()
  if (expectedDigit.length !== 1) return null

  const expected = parseInt(expectedDigit, 10)
  if (isNaN(expected)) return null

  const computed = computeCheckDigit(passportNumber.toUpperCase().replace(/\s/g, ''))
  return computed === expected
}

/**
 * Simple heuristic check: does this string look like it could be a passport
 * number that came from an MRZ (all uppercase alphanumeric, 5-12 chars)?
 * Used to decide whether to attempt check-digit validation at all.
 */
export function looksLikeMrzPassportNumber(value: string): boolean {
  if (!value || value.length < 5 || value.length > 12) return false
  return /^[A-Z0-9<]+$/i.test(value.trim())
}
