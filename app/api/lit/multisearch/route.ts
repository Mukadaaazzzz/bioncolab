import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Optional envs:
 *  - CROSSREF_MAILTO = you@domain.com   // polite pool
 *  - SEMANTIC_SCHOLAR_KEY = <key>       // optional; avoids 429
 */
const MAILTO = process.env.CROSSREF_MAILTO || ''
const S2_KEY = process.env.SEMANTIC_SCHOLAR_KEY || ''

type LitItem = {
  id: string
  source: 'crossref' | 'arxiv' | 's2'
  title: string
  year?: number
  authors?: string[]
  abstract?: string
  doi?: string
  url?: string
  citationCount?: number
  externalIds?: Record<string, string>
}

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

const withTimeout = async (p: Promise<Response>, ms = 6000) => {
  let to: NodeJS.Timeout
  const timeout = new Promise<Response>((_, rej) => {
    to = setTimeout(() => rej(new Error('timeout')), ms)
  })
  try {
    const res = await Promise.race([p, timeout])
    return res as Response
  } finally {
    clearTimeout(to!)
  }
}

const safeFetchText = async (url: string, init?: RequestInit) => {
  const res = await withTimeout(fetch(url, { ...init, next: { revalidate: 0 } }))
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 300)}`)
  return text
}

const safeFetchJSON = async (url: string, init?: RequestInit) => {
  const res = await withTimeout(fetch(url, { ...init, next: { revalidate: 0 } }))
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 300)}`)
  if (!/json/i.test(ct)) {
    if (/<!doctype|<html/i.test(text)) throw new Error('Non-JSON (HTML) response')
    try { return JSON.parse(text) } catch { throw new Error('Invalid JSON') }
  }
  try { return JSON.parse(text) } catch { throw new Error('Invalid JSON') }
}

/** -------- helpers to guarantee externalIds is either defined keys or undefined -------- */
function buildExternalIds(parts: Array<[string, string | undefined]>): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const [k, v] of parts) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return Object.keys(out).length ? out : undefined
}

const normDOI = (doi?: string | null): string | undefined => {
  if (!doi) return undefined
  let d = doi.trim().toLowerCase()
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
  return d || undefined
}

const normArxivId = (id?: string | null): string | undefined => {
  if (!id) return undefined
  let s = id.trim().toLowerCase()
  s = s.replace(/^arxiv:/, '')
  s = s.replace(/v\d+$/, '') // strip version suffix
  return s || undefined
}

const normTitle = (t?: string | null) =>
  (t || '')
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()

/** ---------------- Crossref ---------------- */
async function searchCrossref(query: string, rows = 20): Promise<LitItem[]> {
  const u = new URL('https://api.crossref.org/works')
  u.searchParams.set('query', query)
  u.searchParams.set('rows', String(rows))
  if (MAILTO) u.searchParams.set('mailto', MAILTO)

  const data = await safeFetchJSON(u.toString())
  const items: any[] = data?.message?.items || []

  return items.map((it) => {
    const title = Array.isArray(it.title) ? it.title[0] : it.title || ''
    const year = it?.issued?.['date-parts']?.[0]?.[0]
    const authors = Array.isArray(it?.author)
      ? it.author
          .map((a: any) => [a?.given, a?.family].filter(Boolean).join(' '))
          .filter(Boolean)
      : []
    const doi = normDOI(it?.DOI)
    const url = it?.URL || (doi ? `https://doi.org/${doi}` : undefined)
    const citationCount =
      typeof it?.['is-referenced-by-count'] === 'number'
        ? it['is-referenced-by-count']
        : undefined

    const abstractRaw: string | undefined =
      typeof it?.abstract === 'string' ? it.abstract : undefined
    const abstract = abstractRaw ? abstractRaw.replace(/<[^>]+>/g, '').trim() : undefined

    const externalIds = buildExternalIds([['DOI', doi]])

    return {
      id: doi || it?.URL || title,
      source: 'crossref',
      title,
      year,
      authors,
      abstract,
      doi,
      url,
      citationCount,
      externalIds,
    } as LitItem
  })
}

/** ---------------- arXiv (Atom XML) ---------------- */
function parseArxivAtom(atom: string): LitItem[] {
  const entries = atom.split(/<entry>/g).slice(1)
  const out: LitItem[] = []

  for (const e of entries) {
    const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, ' ').trim() || ''
    const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, ' ').trim() || ''
    const idUrl = (e.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim() || ''
    const published = (e.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || ''
    const year = published ? Number((published.match(/\d{4}/) || [])[0]) : undefined

    const authors: string[] = []
    const authorBlocks = e.match(/<author>[\s\S]*?<\/author>/g) || []
    for (const ab of authorBlocks) {
      const name = (ab.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim()
      if (name) authors.push(name)
    }

    const aid = (idUrl.match(/arxiv\.org\/abs\/([\w.\-]+)(v\d+)?/) || [])[1]
    const arxivId = normArxivId(aid) || normArxivId(idUrl)

    let url = idUrl
    const linkAbs = (e.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/) || [])[1]
    if (linkAbs) url = linkAbs

    const externalIds = buildExternalIds([['arXiv', arxivId]])

    out.push({
      id: arxivId || idUrl || title,
      source: 'arxiv',
      title,
      year,
      authors,
      abstract: summary || undefined,
      url,
      externalIds,
    })
  }

  return out
}

async function searchArxiv(query: string, max = 20): Promise<LitItem[]> {
  const u = new URL('http://export.arxiv.org/api/query')
  u.searchParams.set('search_query', `all:${query}`)
  u.searchParams.set('start', '0')
  u.searchParams.set('max_results', String(max))
  const text = await safeFetchText(u.toString(), { headers: { Accept: 'application/atom+xml' } })
  return parseArxivAtom(text)
}

/** ---------------- Semantic Scholar ---------------- */
async function searchS2(query: string, limit = 20): Promise<LitItem[]> {
  const u = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  u.searchParams.set('query', query)
  u.searchParams.set('limit', String(limit))
  u.searchParams.set('fields', [
    'title',
    'year',
    'authors',
    'citationCount',
    'abstract',
    'externalIds',
    'url'
  ].join(','))

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (S2_KEY) headers['x-api-key'] = S2_KEY

  const data = await safeFetchJSON(u.toString(), { headers })
  const papers: any[] = data?.data || []

  return papers.map((p) => {
    const authors = Array.isArray(p?.authors)
      ? p.authors.map((a: any) => a?.name).filter(Boolean)
      : []
    const ext = p?.externalIds || {}
    const doi = normDOI(ext?.DOI)
    const arxiv = normArxivId(ext?.ArXiv)

    const externalIds = buildExternalIds([
      ['DOI', doi],
      ['arXiv', arxiv],
      ['S2', typeof p?.paperId === 'string' && p.paperId ? p.paperId : undefined],
    ])

    return {
      id: p?.paperId || doi || arxiv || p?.url || p?.title,
      source: 's2',
      title: p?.title || '',
      year: typeof p?.year === 'number' ? p.year : undefined,
      authors,
      abstract: p?.abstract || undefined,
      doi,
      url: p?.url || (doi ? `https://doi.org/${doi}` : undefined),
      citationCount: typeof p?.citationCount === 'number' ? p.citationCount : undefined,
      externalIds,
    } as LitItem
  })
}

/** ---------------- Dedupe + Rank ---------------- */
function dedupeAndRank(items: LitItem[], nowYear = new Date().getFullYear(), topN = 12) {
  type Key = string
  const byKey = new Map<Key, LitItem>()

  const makeKey = (x: LitItem) => {
    const doi = x.doi ? `doi:${x.doi}` : ''
    const ax = x.externalIds?.arXiv ? `arxiv:${x.externalIds.arXiv}` : ''
    const normT = normTitle(x.title)
    const y = x.year ? `y:${x.year}` : ''
    return doi || ax || `t:${normT}|${y}`
  }

  for (const it of items) {
    const k = makeKey(it)
    if (!k) continue
    const existing = byKey.get(k)
    if (!existing) {
      byKey.set(k, it)
    } else {
      const pick =
        (it.citationCount || 0) > (existing.citationCount || 0)
          ? it
          : existing.abstract
          ? existing
          : it.abstract
          ? it
          : existing
      byKey.set(k, pick)
    }
  }

  const merged = Array.from(byKey.values())

  const scored = merged.map((x) => {
    const c = x.citationCount ?? 0
    const cit = Math.log10(1 + Math.max(0, c)) * 1.5
    const age = x.year ? nowYear - x.year : 10
    let recency = 0
    if (age <= 2) recency = 2
    else if (age <= 5) recency = 1
    const srcNudge = x.source === 's2' ? 0.1 : 0
    const score = cit + recency + srcNudge
    return { score, item: x }
  })

  scored.sort((a, b) => b.score - a.score)
  const ranked = scored.map((s) => s.item)
  return { items: merged, top: ranked.slice(0, topN) }
}

/** ---------------- Route ---------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const query: string = (body?.query || '').trim()
    const limit: number = Math.min(Math.max(Number(body?.limit || 20), 1), 50)

    if (!query) return json({ error: 'Provide "query"' }, 400)

    const [cr, ax, s2] = await Promise.allSettled([
      searchCrossref(query, limit),
      searchArxiv(query, limit),
      searchS2(query, limit)
    ])

    const items: LitItem[] = []
    if (cr.status === 'fulfilled') items.push(...cr.value)
    if (ax.status === 'fulfilled') items.push(...ax.value)
    if (s2.status === 'fulfilled') items.push(...s2.value)

    if (!items.length) {
      const err =
        (cr as any)?.reason?.message ||
        (ax as any)?.reason?.message ||
        (s2 as any)?.reason?.message ||
        'No results'
      return json({ items: [], top: [], warning: err })
    }

    const { items: merged, top } = dedupeAndRank(items, new Date().getFullYear(), 12)
    return json({ items: merged, top })
  } catch (e: any) {
    return json({ error: e.message || 'Server error' }, 500)
  }
}

export async function GET() {
  return json({ ok: true, service: 'lit-multisearch' })
}
