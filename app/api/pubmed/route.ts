import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ------------ ENV (optional but recommended) ------------ */
const NCBI_API = process.env.NCBI_API // your E-utilities key
const NCBI_EMAIL = process.env.NCBI_EMAIL || ''
const NCBI_TOOL = process.env.NCBI_TOOL || 'colab-app'

/** ------------ Helpers ------------ */
function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function ncbiUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  if (NCBI_API) url.searchParams.set('api_key', NCBI_API)
  if (NCBI_EMAIL) url.searchParams.set('email', NCBI_EMAIL)
  if (NCBI_TOOL) url.searchParams.set('tool', NCBI_TOOL)
  return url.toString()
}

async function fetchJsonGuard(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 0 } })
  const ct = res.headers.get('content-type') || ''
  const raw = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 300)}`)
  if (!/application\/json/i.test(ct)) {
    if (/<!DOCTYPE|<html/i.test(raw)) throw new Error('NCBI returned HTML (likely an error page)')
    try { return JSON.parse(raw) } catch { throw new Error('Response not valid JSON') }
  }
  try { return JSON.parse(raw) } catch { throw new Error('Response not valid JSON') }
}

async function fetchTextGuard(url: string) {
  const res = await fetch(url, { headers: { Accept: 'text/plain' }, next: { revalidate: 0 } })
  const raw = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 300)}`)
  if (/<!DOCTYPE|<html/i.test(raw)) throw new Error('NCBI returned HTML (likely an error page)')
  return raw
}

/** Parse MEDLINE "rettype=abstract" text into { [pmid]: abstract } */
function parseAbstractsByPMID(medlineText: string): Record<string, string> {
  const map: Record<string, string> = {}
  const records = medlineText.split(/\n(?=PMID- )/)
  for (const rec of records) {
    const pmid = (rec.match(/^PMID-\s+(\d+)/m) || [])[1]
    if (!pmid) continue
    const lines = rec.split('\n')
    const abstractLines: string[] = []
    let inAB = false
    for (const line of lines) {
      if (/^AB\s+-\s+/.test(line)) {
        inAB = true
        abstractLines.push(line.replace(/^AB\s+-\s+/, ''))
      } else if (inAB && /^ {2}/.test(line) && !/^[A-Z]{2,4}\s+-\s+/.test(line)) {
        abstractLines.push(line.trim())
      } else if (inAB && /^[A-Z]{2,4}\s+-\s+/.test(line)) {
        inAB = false
      }
    }
    const abstract = abstractLines.join(' ').trim()
    if (abstract) map[pmid] = abstract
  }
  return map
}

/** ------------ Types ------------ */
type Paper = {
  pmid: string
  title: string
  journal?: string
  year?: string
  authors?: string[]
  doi?: string
  url: string
  abstract?: string
}

/** ------------ E-utilities minimal flow (single paper) ------------ */
async function esearchFirstPMID(query: string): Promise<string | null> {
  const url = ncbiUrl('esearch.fcgi', {
    db: 'pubmed',
    term: `${query} [Title/Abstract]`,
    retmode: 'json',
    retmax: 1,
    sort: 'relevance',
  })
  const data = await fetchJsonGuard(url)
  const id = data?.esearchresult?.idlist?.[0]
  return id || null
}

async function esummaryOne(pmid: string) {
  const url = ncbiUrl('esummary.fcgi', { db: 'pubmed', retmode: 'json', id: pmid })
  const data = await fetchJsonGuard(url)
  return data?.result?.[pmid] || {}
}

async function efetchAbstractOne(pmid: string) {
  const url = ncbiUrl('efetch.fcgi', {
    db: 'pubmed',
    retmode: 'text',
    rettype: 'abstract',
    id: pmid,
  })
  const txt = await fetchTextGuard(url)
  const map = parseAbstractsByPMID(txt)
  return map[pmid] || ''
}

function buildPaper(pmid: string, s: any, abstract: string): Paper {
  const authors: string[] =
    (Array.isArray(s?.authors) ? s.authors : [])
      .map((a: any) => a?.name)
      .filter(Boolean)
      .slice(0, 20)

  let doi: string | undefined
  if (Array.isArray(s?.articleids)) {
    const doiObj = s.articleids.find((x: any) => (x?.idtype || '').toLowerCase() === 'doi')
    doi = doiObj?.value
  }

  let year: string | undefined
  if (typeof s?.pubdate === 'string') {
    const m = s.pubdate.match(/\b(19|20)\d{2}\b/)
    if (m) year = m[0]
  }

  return {
    pmid,
    title: s?.title || '',
    journal: s?.fulljournalname || s?.source || '',
    year,
    authors,
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    abstract: abstract || undefined,
  }
}

/** ------------ GET probe (debug in browser) ------------ */
export async function GET() {
  return json({ ok: true, service: 'pubmed-single', using: 'NCBI E-utilities' })
}

/**
 * POST body:
 *  - { pmid: "12345678" }  OR  { query: "keywords ..." }
 * Returns:
 *  { paper: { pmid,title,journal,year,authors[],doi,url,abstract } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const pmidRaw = body?.pmid ? String(body.pmid).trim() : ''
    const queryRaw = body?.query ? String(body.query).trim() : ''

    let pmid = pmidRaw
    if (!pmid) {
      if (!queryRaw) return json({ error: 'Provide "pmid" or "query"' }, 400)
      pmid = (await esearchFirstPMID(queryRaw)) || ''
      if (!pmid) return json({ error: `No PubMed result for: ${queryRaw}` }, 404)
    }

    // ESUMMARY + EFETCH
    const s = await esummaryOne(pmid)
    await sleep(60) // tiny courtesy pause
    const ab = await efetchAbstractOne(pmid)

    const paper = buildPaper(pmid, s, ab)
    return json({ paper })
  } catch (e: any) {
    return json({ error: e.message || 'Server error' }, 500)
  }
}
