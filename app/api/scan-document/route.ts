import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mediaType = file.type

    if (mediaType !== 'image/jpeg' && mediaType !== 'image/png' && mediaType !== 'image/webp' && mediaType !== 'image/gif') {
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are an expert AI KYC document extraction engine. You will be provided with an image of a travel document (Passport, Visa, National ID, or Saudi Iqama). 
Your ONLY job is to extract highly accurate data and return a raw JSON object. Do NOT include markdown formatting, backticks, or any conversational text.

CRITICAL RULES:
1. Document Type Detection: First determine if it's a Passport, Visa, or Iqama/ID.
2. PASSPORTS (MRZ Priority): Look for the Machine Readable Zone (MRZ) at the bottom (2-3 lines of text with '<<<'). The MRZ is the absolute source of truth. 
   - Extract Name: Use the MRZ name format (typically SURNAME<<GIVEN<NAMES). Reformat as "Given Names Surname".
   - Extract Passport Number: Get this exact alphanumeric string from the MRZ.
   - Extract Nationality: Convert the 3-letter ISO code in the MRZ to the Full Standard English Country Name (e.g., "PAK" -> "Pakistan", "IND" -> "India", "SAU" -> "Saudi Arabia").
3. SAUDI IQAMA / RESIDENCE CARDS:
   - Iqama numbers are exactly 10 digits long and typically start with '2'.
   - Extract the English name if bilingual. If only Arabic is present, transliterate to English accurately.
   - Nationality should be mapped to the full standard country name.
4. SAUDI VISAS:
   - Look for the Visa/Border number (often 10 digits starting with '3' or '4').
   - Extract the English name if bilingual.
5. STANDARDIZED JSON SCHEMA:
   You MUST return a JSON object with exactly these keys:
   {
     "full_name": "String (First Last)",
     "nationality": "String (Full Standard Country Name, e.g. 'United States', 'Saudi Arabia', 'Egypt', 'Philippines')",
     "passport_number": "String or null",
     "visa_number": "String (Iqama/Visa/Border number) or null",
     "expiry_date": "String (YYYY-MM-DD) or null"
   }
If a field cannot be found, set its value to null.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Extract the information from this document.',
            }
          ],
        },
      ],
    })

    const textContent = message.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error("No text response from Claude")
    }

    const parsedJson = JSON.parse(textContent.text)
    return NextResponse.json(parsedJson)
  } catch (error: any) {
    console.error('Error scanning document:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scan document',
        status: error.status,
        type: error.type 
      }, 
      { status: error.status || 500 }
    )
  }
}
