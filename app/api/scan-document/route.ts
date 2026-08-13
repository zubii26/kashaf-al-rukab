import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Duplicate-scan guard ────────────────────────────────────────────────────
// Module-level Map survives across requests within the same warm instance
// (works in dev + Vercel warm starts). For cross-instance persistence,
// replace with a Redis or Supabase scan_cache table lookup.
type CacheEntry = { result: unknown; expiresAt: number }
const scanCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCached(hash: string): unknown | null {
  const entry = scanCache.get(hash)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { scanCache.delete(hash); return null }
  return entry.result
}

function setCache(hash: string, result: unknown): void {
  // Bounded LRU: evict oldest when over 500 entries
  if (scanCache.size >= 500) {
    const firstKey = scanCache.keys().next().value
    if (firstKey) scanCache.delete(firstKey)
  }
  scanCache.set(hash, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Optimised system prompt (~175 tokens, down from ~350) ──────────────────
// Every extra token is billed on every scan across all drivers, all day.
const SYSTEM_PROMPT = `You extract data from travel document images (Passport, Visa, Saudi Iqama).
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

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse file ────────────────────────────────────────────────────────────
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // ── Server-side size guard (5 MB) ─────────────────────────────────────────
    // Client already resizes to ≤1024px, but this guards against direct API calls.
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 5 MB — please resize before uploading.' },
        { status: 413 }
      )
    }

    // ── MIME guard ────────────────────────────────────────────────────────────
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Duplicate-scan guard ──────────────────────────────────────────────────
    const imageHash = createHash('sha256').update(buffer).digest('hex')
    const cached = getCached(imageHash)
    if (cached) {
      return NextResponse.json(cached)
    }

    const base64Image = buffer.toString('base64')
    const mediaType = (
      file.type === 'image/png' ? 'image/png'
      : file.type === 'image/webp' ? 'image/webp'
      : file.type === 'image/gif' ? 'image/gif'
      : 'image/jpeg'
    ) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // ── Store image in private Supabase Storage ───────────────────────────────
    const admin = createAdminClient()
    const ext = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `scans/${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('document-images')
      .upload(storagePath, buffer, { contentType: mediaType, upsert: false })

    if (uploadError) {
      console.error('[scan-document] Storage upload error:', uploadError.message)
      // Non-fatal: scan still works even if storage fails
    }

    // ── Call Claude Haiku 4.5 ─────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,                          // JSON output is ~100-120 tokens
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Prompt caching: same system prompt sent on every scan request.
          // cache_control tells Anthropic to cache this block across requests.
          // Active when the cached block reaches the model's minimum token
          // threshold (2048 for Haiku). At our current ~175-token prompt this
          // directive is recorded but not yet active — it will activate
          // automatically if the prompt ever grows past the threshold.
          cache_control: { type: 'ephemeral' },
        } as Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            { type: 'text', text: 'Extract.' },
          ],
        },
      ],
    })

    // ── Parse response ────────────────────────────────────────────────────────
    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    let raw = textBlock.text.trim()
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsed = JSON.parse(raw)

    if (parsed.error === 'not_a_document' || parsed.error === 'unreadable') {
      return NextResponse.json(
        { error: parsed.message || 'Could not read document' },
        { status: 422 }
      )
    }

    const result = {
      ...parsed,
      document_image_url: uploadError ? null : storagePath,
    }

    // Cache successful extraction result
    setCache(imageHash, result)

    return NextResponse.json(result)

  } catch (error: unknown) {
    const err = error as { status?: number; type?: string; message?: string }
    console.error('[scan-document] Error:', err?.message)

    if (err?.status === 400 && err?.type === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'Image could not be processed. Please ensure it is a clear, well-lit photo.' },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: err?.message || 'Scan failed. Please try again.' },
      { status: err?.status || 500 }
    )
  }
}
