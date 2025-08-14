// app/api/litreview/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/** -------------------- Types -------------------- */
type Paper = {
  id: string
  title: string
  authors: string
  journal: string
  year: string | number
  abstract?: string
  url: string
  source: string
  citations?: number
  doi?: string
}

/** -------------------- API Functions -------------------- */

// CrossRef API (free, no key needed)
async function searchCrossRef(query: string, limit: number = 10): Promise<Paper[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&sort=relevance&order=desc`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LitReview/1.0 (mailto:research@example.com)' }
    })
    
    if (!response.ok) throw new Error('CrossRef API error')
    
    const data = await response.json()
    
    return (data.message?.items || []).map((item: any) => ({
      id: item.DOI || Math.random().toString(36),
      title: Array.isArray(item.title) ? item.title[0] : (item.title || 'No title'),
      authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`).filter(Boolean).join(', ') || 'Unknown',
      journal: Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || 'Unknown'),
      year: item.published?.['date-parts']?.[0]?.[0] || 'Unknown',
      doi: item.DOI,
      url: item.URL || `https://doi.org/${item.DOI}`,
      abstract: item.abstract,
      source: 'CrossRef',
      citations: item['is-referenced-by-count'] || 0
    }))
  } catch (error) {
    console.error('CrossRef search failed:', error)
    return []
  }
}

// arXiv API (free, no key needed)
async function searchArxiv(query: string, limit: number = 10): Promise<Paper[]> {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('arXiv API error')
    
    const xmlText = await response.text()
    
    // Simple XML parsing for arXiv
    const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || []
    
    return entries.map((entry, index) => {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || 'No title'
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || ''
      const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || []
      const authors = authorMatches.map(m => m.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim()).filter(Boolean).join(', ') || 'Unknown'
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || ''
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || ''
      const year = published ? new Date(published).getFullYear() : 'Unknown'
      
      return {
        id: id || `arxiv-${index}`,
        title,
        authors,
        journal: 'arXiv preprint',
        year,
        abstract: summary,
        url: id || '#',
        source: 'arXiv'
      }
    })
  } catch (error) {
    console.error('arXiv search failed:', error)
    return []
  }
}

// Semantic Scholar API (free with limits, no key needed)
async function searchSemanticScholar(query: string, limit: number = 10): Promise<Paper[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,authors,year,abstract,journal,citationCount,url,externalIds`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LitReview/1.0' }
    })
    
    if (!response.ok) throw new Error('Semantic Scholar API error')
    
    const data = await response.json()
    
    return (data.data || []).map((paper: any) => ({
      id: paper.paperId || Math.random().toString(36),
      title: paper.title || 'No title',
      authors: paper.authors?.map((a: any) => a.name).filter(Boolean).join(', ') || 'Unknown',
      journal: paper.journal?.name || 'Unknown',
      year: paper.year || 'Unknown',
      abstract: paper.abstract,
      url: paper.url || `https://semanticscholar.org/paper/${paper.paperId}`,
      source: 'Semantic Scholar',
      citations: paper.citationCount || 0,
      doi: paper.externalIds?.DOI
    }))
  } catch (error) {
    console.error('Semantic Scholar search failed:', error)
    return []
  }
}

// Enhanced Gemini analysis
async function analyzeWithGemini(query: string, papers: Paper[]): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')
  
  const prompt = `You are a research expert conducting a comprehensive literature review.

RESEARCH QUERY: "${query}"

PAPERS FOUND (${papers.length} from multiple academic sources):
${papers.slice(0, 30).map((p, i) => `
${i + 1}. ${p.title}
   Authors: ${p.authors}
   Journal: ${p.journal} (${p.year})
   Source: ${p.source}${p.citations ? ` | Citations: ${p.citations}` : ''}
   ${p.abstract ? `Abstract: ${p.abstract.substring(0, 300)}...` : 'No abstract available'}
`).join('\n')}

Provide a comprehensive literature review with:

## Executive Summary
Brief 2-3 sentence overview of the current state of research in this area.

## Key Themes & Findings
Group similar research findings and identify major themes. Note any methodological trends.

## Research Quality & Impact
Highlight highly cited papers and reputable sources. Assess the overall quality of evidence.

## Methodological Analysis
Common research approaches, data sources, and limitations across studies.

## Consensus vs. Controversies
Where researchers agree and where there are disagreements or debates.

## Research Gaps & Future Directions
What's missing from current research and promising areas for future investigation.

## Recommended Papers
Top 5-7 most relevant papers with brief justification for each.

Format with clear headers. When referencing specific findings, cite as [Paper #]. Be scholarly but accessible.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.3, 
            maxOutputTokens: 4000,
            topP: 0.8,
            topK: 40
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis failed - no response from Gemini'
  } catch (error: any) {
    console.error('Gemini analysis failed:', error)
    return `Analysis failed: ${error.message}`
  }
}

/** -------------------- Main Route -------------------- */
export async function POST(req: NextRequest) {
  console.log('🔥 Multi-Source Literature Review API Hit')
  
  try {
    const body = await req.json().catch(() => ({}))
    console.log('📝 Request body:', body)
    
    const query: string = String(body?.query || '').trim()
    if (!query) {
      return NextResponse.json({ error: 'Missing "query" parameter' }, { status: 400 })
    }

    const maxResults: number = Math.min(Math.max(Number(body?.maxResults || 30), 5), 100)
    const sources: string[] = body?.sources || ['crossref', 'arxiv', 'semantic']
    
    console.log(`🔍 Searching for: "${query}" (max: ${maxResults})`)
    console.log(`📚 Sources: ${sources.join(', ')}`)

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    // Search all sources in parallel
    const resultsPerSource = Math.ceil(maxResults / sources.length)
    const searchPromises: Promise<Paper[]>[] = []
    
    if (sources.includes('crossref')) {
      searchPromises.push(searchCrossRef(query, resultsPerSource))
    }
    if (sources.includes('arxiv')) {
      searchPromises.push(searchArxiv(query, resultsPerSource))
    }
    if (sources.includes('semantic')) {
      searchPromises.push(searchSemanticScholar(query, resultsPerSource))
    }

    console.log(`🚀 Starting ${searchPromises.length} parallel searches...`)
    
    const results = await Promise.allSettled(searchPromises)
    const allPapers = results
      .filter((r): r is PromiseFulfilledResult<Paper[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
    
    console.log(`📄 Found ${allPapers.length} total papers`)

    // Remove duplicates based on title similarity
    const uniquePapers = deduplicatePapers(allPapers)
    console.log(`🔄 After deduplication: ${uniquePapers.length} papers`)

    // Sort by citations (if available) and relevance
    const sortedPapers = uniquePapers
      .sort((a, b) => (b.citations || 0) - (a.citations || 0))
      .slice(0, maxResults)

    if (sortedPapers.length === 0) {
      return NextResponse.json({ 
        review: `No papers found for query: "${query}". Try different keywords or check spelling.`,
        papers: [],
        stats: { totalFound: 0, sources: sources.join(', ') }
      })
    }

    console.log('🤖 Starting Gemini analysis...')
    
    // Analyze with Gemini
    const review = await analyzeWithGemini(query, sortedPapers)
    
    console.log('✅ Literature review complete')

    return NextResponse.json({
      review,
      papers: sortedPapers,
      stats: {
        totalFound: sortedPapers.length,
        sources: sources.join(', '),
        searchTime: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('🚨 Literature Review Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Server error during literature review' 
    }, { status: 500 })
  }
}

/** -------------------- Helper Functions -------------------- */
function deduplicatePapers(papers: Paper[]): Paper[] {
  const seen = new Set<string>()
  const unique: Paper[] = []
  
  for (const paper of papers) {
    // Create a normalized title for comparison
    const normalizedTitle = paper.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (!seen.has(normalizedTitle) && normalizedTitle.length > 10) {
      seen.add(normalizedTitle)
      unique.push(paper)
    }
  }
  
  return unique
}

// Optional: Add a simple GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    message: "Multi-Source Literature Review API", 
    endpoints: {
      POST: "Conduct literature review",
      parameters: {
        query: "string (required)",
        maxResults: "number (5-100, default: 30)",
        sources: "array ['crossref', 'arxiv', 'semantic'] (default: all)"
      }
    }
  })
}