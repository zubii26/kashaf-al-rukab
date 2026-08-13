import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Fix #3 — Auth check: only authenticated users may call this endpoint
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[scan-document] auth user:', user?.id ?? 'null', 'authError:', authError?.message ?? 'none')
    if (!user) {
      // In production, enforce auth strictly
      // In dev, log but continue so we can diagnose other issues
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.warn('[scan-document] No user found but continuing in dev mode')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
    // If type is empty (can happen with some WhatsApp/Windows files), let Claude decide
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload an image.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Feature B — Upload image to private Supabase Storage before calling Claude
    // Uses admin client to bypass RLS (storage insert requires admin)
    const admin = createAdminClient()
    const timestamp = Date.now()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `scans/${user?.id ?? 'anonymous'}/${timestamp}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('document-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[scan-document] Storage upload error:', uploadError.message)
      // Non-fatal: log but continue — scanning still works even if storage fails
    }

    const documentImageUrl = uploadError ? null : storagePath

    // Call Claude Haiku 4.5 for document extraction
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are a KYC document extraction engine. You receive images of travel documents (Passport, Visa, Saudi Iqama/Residence Card).

FIRST: Determine if the image is actually a travel document. If it is NOT (e.g. a selfie, random photo, screenshot, blank image), return ONLY this JSON:
{"error": "not_a_document", "message": "Image does not appear to be a travel document. Please upload a photo of a passport, visa, or ID card."}

If it IS a travel document, extract the fields below and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

EXTRACTION RULES:
- Passports: prioritize the MRZ zone (bottom lines with <<< characters) as source of truth.
- Name: format as "Given Names Surname" in English.
- Nationality: convert 3-letter ISO code to full country name (e.g. PAK → Pakistan, IND → India, SAU → Saudi Arabia).
- Iqama numbers: exactly 10 digits, usually start with 2.
- Visa/Border numbers: 10 digits, usually start with 3 or 4.
- Dates: format as YYYY-MM-DD.
- If a field is not visible or unreadable, use null — never guess.
- If the image is blurry or unreadable, return: {"error": "unreadable", "message": "Image is too blurry or dark to read. Please retake the photo in good lighting."}

REQUIRED JSON SCHEMA (return exactly these keys):
{
  "full_name": "String or null",
  "nationality": "String (full country name) or null",
  "passport_number": "String or null",
  "visa_number": "String (Iqama/Visa/Border number) or null",
  "expiry_date": "String (YYYY-MM-DD) or null"
}`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Extract the information from this document.',
            },
          ],
        },
      ],
    })

    const textContent = message.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Fix #1 — Strip markdown code fences before parsing
    let rawText = textContent.text.trim()
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsedJson = JSON.parse(rawText)

    // Feature A — Handle non-document and unreadable image errors
    if (parsedJson.error === 'not_a_document' || parsedJson.error === 'unreadable') {
      return NextResponse.json(
        { error: parsedJson.message || 'Could not read document' },
        { status: 422 }
      )
    }

    // Feature B — Include storage path in response so the client can save it with the passenger
    return NextResponse.json({
      ...parsedJson,
      document_image_url: documentImageUrl,
    })

  } catch (error: any) {
    console.error('[scan-document] Error:', error?.message || error)

    // Provide actionable error messages instead of raw API errors
    if (error?.status === 400 && error?.type === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'Image could not be processed. Please ensure it is a clear, well-lit photo.' },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to scan document. Please try again.' },
      { status: error.status || 500 }
    )
  }
}
