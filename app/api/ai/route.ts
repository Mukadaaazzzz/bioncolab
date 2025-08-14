// app/api/ai/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// minimal cleaner: remove **bold**, *italics*, turn "* " bullets into "- ", and drop any leftover *
function cleanNoAsterisk(s: string) {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')      // **bold** -> bold
    .replace(/(^|[\s(])\*(.*?)\*/g, '$1$2') // *italics* -> italics
    .replace(/^\s*\*\s+/gm, '- ')         // * bullets -> - bullets
    .replace(/\*/g, '')                   // remove any remaining asterisks
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, readme = '', recent = [] } = await req.json()
    const key = process.env.GEMINI_API_KEY
    if (!key) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })

    const contents = [
      { role: 'user', parts: [{ text: `README:\n${readme.slice(0,6000)}` }] },
      { role: 'user', parts: [{ text: recent.length ? `Recent contributions:\n${recent.map((r: any)=>`- ${r}`).join('\n')}` : '' }] },
      { role: 'user', parts: [{ text: prompt }] }
    ]

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      }
    )

    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Gemini error', extra: data }, { status: resp.status })
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''
    const text = cleanNoAsterisk(raw)

    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
