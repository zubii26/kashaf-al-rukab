import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AI_MODEL, SYSTEM_PROMPT, GENERATION_CONFIG } from '@/lib/ai/extractDocument'

// ─── Duplicate-scan guard ─────────────────────────────────────────────────────
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

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse file ──────────────────────────────────────────────────────────
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // ── Server-side size guard (5 MB) ───────────────────────────────────────
    // Client already resizes to ≤1024px, but this guards against direct API calls.
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 5 MB — please resize before uploading.' },
        { status: 413 }
      )
    }

    // ── MIME guard ──────────────────────────────────────────────────────────
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Duplicate-scan guard ─────────────────────────────────────────────────
    const imageHash = createHash('sha256').update(buffer).digest('hex')
    const cached = getCached(imageHash)
    if (cached) {
      return NextResponse.json(cached)
    }

    const base64Image = buffer.toString('base64')
    const mimeType = (
      file.type === 'image/png'  ? 'image/png'  :
      file.type === 'image/webp' ? 'image/webp' :
      file.type === 'image/gif'  ? 'image/gif'  :
      'image/jpeg'
    )

    // ── Store image in private Supabase Storage ──────────────────────────────
    const admin = createAdminClient()
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `scans/${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('document-images')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) {
      console.error('[scan-document] Storage upload error:', uploadError.message)
      // Non-fatal: scan still works even if storage fails
    }

    // ── Call Gemini 2.5 Flash-Lite ───────────────────────────────────────────
    // Model name is isolated in lib/ai/extractDocument.ts — one-line swap
    // when gemini-2.5-flash-lite retires on 2026-10-16.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: AI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: GENERATION_CONFIG,
    })

    const aiResult = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      'Extract.',
    ])

    // ── Parse response ────────────────────────────────────────────────────────
    let raw = aiResult.response.text().trim()
    // Strip markdown fences if the model wraps output despite instructions
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
    const err = error as { status?: number; message?: string; code?: string }
    console.error('[scan-document] Error:', err?.message)

    // Map Gemini error signals to the same 422 category the frontend expects
    // for unprocessable images (invalid content, safety blocks, bad format, etc.)
    const msg = err?.message ?? ''
    if (
      err?.status === 400 ||
      msg.includes('INVALID_ARGUMENT') ||
      msg.includes('safety') ||
      msg.includes('image') ||
      msg.includes('Unable to process')
    ) {
      return NextResponse.json(
        { error: 'Image could not be processed. Please ensure it is a clear, well-lit photo.' },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: msg || 'Scan failed. Please try again.' },
      { status: err?.status || 500 }
    )
  }
}
