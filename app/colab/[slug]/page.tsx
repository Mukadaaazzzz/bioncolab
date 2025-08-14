'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import {
  FiHome, FiGitBranch, FiCpu, FiTerminal, FiUsers, FiDatabase, FiPlus, FiX, FiCalendar,
  FiLock, FiGlobe, FiArrowLeft, FiEdit2, FiTrash2, FiCheck, FiUserPlus
} from 'react-icons/fi'

/** ---------- Sticky localStorage state (persists across refresh/navigation) ---------- */
function useStickyState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch { return initial }
  })

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(state)) } catch {}
  }, [key, state])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      setState(raw ? (JSON.parse(raw) as T) : initial)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) setState(JSON.parse(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [state, setState] as const
}

/** ---------- Types ---------- */
interface Colab { id: string; name: string; slug: string; description: string; readme: string; is_public: boolean; owner_id: string }
interface Profile { id: string; username: string; full_name: string; avatar_url: string | null; bio?: string; role?: string }
interface ContributionRow { id: string; colab_id: string; user_id: string; description: string; created_at: string }
interface NoteRow { id: string; colab_id: string; user_id: string; content: string; created_at: string }

interface Contribution extends ContributionRow { user: Profile }
interface ResearchNote extends NoteRow { user: Profile }

/** ---------- Page ---------- */
export default function ColabPage() {
  const [colab, setColab] = useState<Colab | null>(null)
  const [creator, setCreator] = useState<Profile | null>(null)
  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showContributionModal, setShowContributionModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editing, setEditing] = useState<{ type: 'contribution'|'note'; id: string; value: string } | null>(null)

  const router = useRouter()
  const { slug } = useParams() as { slug?: string }

  const sectionKey = colab ? `colab:${colab.id}:section` : 'colab:pending:section'
  const [currentSection, setCurrentSection] = useStickyState<
    'overview'|'contributions'|'ai-copilot'|'compute-sandbox'|'peer-review'|'data-vault'
  >(sectionKey, 'overview')

  const canCreate = useMemo(() => {
    if (!colab || !sessionUser) return false
    if (userRole === 'owner' || userRole === 'moderator' || userRole === 'member') return true
    return !!colab.is_public
  }, [colab, sessionUser, userRole])

  const canModerate = userRole === 'owner' || userRole === 'moderator'

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/signin'); return }
        setSessionUser({ id: user.id })

        const { data: colabData, error: colabError } = await supabase.from('colabs').select('*').eq('slug', slug).single()
        if (colabError || !colabData) throw new Error(colabError?.message || 'Colab not found')
        setColab(colabData as Colab)

        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, role')
          .eq('id', colabData.owner_id)
          .single()
        setCreator(creatorData as Profile)

        const { data: memberData, error: memberError } = await supabase
          .from('colab_members').select('role').eq('colab_id', colabData.id).eq('user_id', user.id).maybeSingle()
        if (!memberError) setUserRole(memberData?.role || null)

        const { data: contributionsData } = await supabase
          .from('contributions')
          .select('*, user:profiles(id, username, full_name, avatar_url)')
          .eq('colab_id', colabData.id)
          .order('created_at', { ascending: false })
        setContributions((contributionsData || []) as Contribution[])

        const { data: notesData } = await supabase
          .from('research_notes')
          .select('*, user:profiles(id, username, full_name, avatar_url)')
          .eq('colab_id', colabData.id)
          .order('created_at', { ascending: false })
        setResearchNotes((notesData || []) as ResearchNote[])
      } catch (err: any) {
        setError(err.message || 'Failed to load colab')
      } finally { setLoading(false) }
    }
    fetchData()
  }, [slug, router])

  const joinColab = async () => {
    if (!colab || !sessionUser) return
    await supabase.from('colab_members').upsert({ colab_id: colab.id, user_id: sessionUser.id, role: 'member' })
    setUserRole('member')
  }

  const handleCreateContribution = async (description: string) => {
    if (!colab || !sessionUser) return
    if (!userRole && colab.is_public) await joinColab()
    const { data, error } = await supabase
      .from('contributions')
      .insert({ colab_id: colab.id, user_id: sessionUser.id, description })
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .single()
    if (!error && data) setContributions(prev => [data as Contribution, ...prev])
    setShowContributionModal(false)
  }

  const handleCreateNote = async (content: string) => {
    if (!colab || !sessionUser) return
    if (!userRole && colab.is_public) await joinColab()
    const { data, error } = await supabase
      .from('research_notes')
      .insert({ colab_id: colab.id, user_id: sessionUser.id, content })
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .single()
    if (!error && data) setResearchNotes(prev => [data as ResearchNote, ...prev])
    setShowNoteModal(false)
  }

  const startEdit = (type: 'contribution'|'note', id: string, value: string) => setEditing({ type, id, value })

  const saveEdit = async () => {
    if (!editing) return
    if (editing.type === 'contribution') {
      const { data } = await supabase.from('contributions').update({ description: editing.value }).eq('id', editing.id)
        .select('*, user:profiles(id, username, full_name, avatar_url)').single()
      if (data) setContributions(prev => prev.map(c => c.id === editing.id ? (data as Contribution) : c))
    } else {
      const { data } = await supabase.from('research_notes').update({ content: editing.value }).eq('id', editing.id)
        .select('*, user:profiles(id, username, full_name, avatar_url)').single()
      if (data) setResearchNotes(prev => prev.map(n => n.id === editing.id ? (data as ResearchNote) : n))
    }
    setEditing(null)
  }

  const removeItem = async (type: 'contribution'|'note', id: string) => {
    if (type === 'contribution') {
      await supabase.from('contributions').delete().eq('id', id)
      setContributions(prev => prev.filter(c => c.id !== id))
    } else {
      await supabase.from('research_notes').delete().eq('id', id)
      setResearchNotes(prev => prev.filter(n => n.id !== id))
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <div className="animate-pulse text-slate-600">Loading collaboration…</div>
    </div>
  )
  if (error || !colab) return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <div className="bg-white border rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-sm text-red-600 mb-3">{error || 'Colab not found'}</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"> <FiArrowLeft/> Back to Dashboard</Link>
      </div>
    </div>
  )

  const sections = [
    { id: 'overview', label: 'Overview', icon: FiHome, count: null },
    { id: 'contributions', label: 'Contributions', icon: FiGitBranch, count: contributions.length },
    { id: 'ai-copilot', label: 'AI Co-Pilot', icon: FiCpu, count: null },
    { id: 'compute-sandbox', label: 'Compute', icon: FiTerminal, count: null },
    { id: 'peer-review', label: 'Peer Review', icon: FiUsers, count: researchNotes.length },
    { id: 'data-vault', label: 'Data Vault', icon: FiDatabase, count: null },
  ] as const

  const Avatar = ({ u }: { u: Profile }) => (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center overflow-hidden">
      {u?.avatar_url ? <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover"/> : <span className="text-white font-semibold">{u?.full_name?.[0] || 'U'}</span>}
    </div>
  )

  const isAuthor = (userId?: string) => userId && sessionUser?.id === userId

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur sticky top-0 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900"><FiArrowLeft/> <span className="hidden sm:inline">Dashboard</span></Link>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl grid place-items-center shrink-0">
              <span className="text-white font-bold text-sm sm:text-base">{colab.name[0]}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">{colab.name}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {colab.is_public ? (<><FiGlobe className="shrink-0"/> Public</>) : (<><FiLock className="shrink-0"/> Private</>)}
                <span className="hidden sm:inline">· by @{creator?.username || 'unknown'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!userRole && colab.is_public && (
              <button onClick={joinColab} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-slate-700 hover:bg-slate-50"><FiUserPlus/> Join</button>
            )}
          </div>
        </div>
        <div className="border-t">
          <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-1">
              {sections.map(s => (
                <button key={s.id}
                  onClick={() => setCurrentSection(s.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm border-b-2 whitespace-nowrap ${currentSection===s.id?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:text-slate-900'}`}>
                  <s.icon className="w-4 h-4"/> {s.label}
                  {s.count ? <span className={`text-xs px-2 py-0.5 rounded-full ${currentSection===s.id?'bg-blue-100 text-blue-800':'bg-slate-100 text-slate-600'}`}>{s.count}</span> : null}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {currentSection === 'overview' && (
          <Overview colab={colab} creator={creator} role={userRole} />
        )}

        {currentSection === 'contributions' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Contributions</h2>
                <p className="text-slate-600 text-sm">Progress and milestones</p>
              </div>
              {canCreate && (
                <button onClick={()=>setShowContributionModal(true)} className="hidden sm:inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"><FiPlus/> Add</button>
              )}
            </div>

            {contributions.length? contributions.map((c,i)=> (
              <article key={c.id} className="bg-white border rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Avatar u={c.user}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-1">
                      <span className="font-medium text-slate-900">{c.user.full_name || 'Anonymous'}</span>
                      <span>@{c.user.username}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3"/>{new Date(c.created_at).toLocaleDateString()}</span>
                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">#{i+1}</span>
                    </div>
                    {editing?.type==='contribution' && editing.id===c.id ? (
                      <div className="space-y-2">
                        <textarea value={editing.value} onChange={e=>setEditing({ ...editing, value: e.target.value })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500"/>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white"><FiCheck/> Save</button>
                          <button onClick={()=>setEditing(null)} className="px-3 py-2 rounded-lg border">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 whitespace-pre-wrap">{c.description}</p>
                    )}
                  </div>
                  {(isAuthor(c.user.id) || canModerate) && !editing && (
                    <div className="flex gap-1">
                      <button onClick={()=>startEdit('contribution', c.id, c.description)} className="p-2 rounded-lg hover:bg-slate-100" title="Edit"><FiEdit2/></button>
                      <button onClick={()=>removeItem('contribution', c.id)} className="p-2 rounded-lg hover:bg-slate-100" title="Delete"><FiTrash2/></button>
                    </div>
                  )}
                </div>
              </article>
            )) : (
              <Empty state="contrib" onAdd={canCreate?()=>setShowContributionModal(true):undefined} />
            )}
          </section>
        )}

        {currentSection === 'peer-review' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Peer Review</h2>
                <p className="text-slate-600 text-sm">Notes and feedback</p>
              </div>
              {canCreate && (
                <button onClick={()=>setShowNoteModal(true)} className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"><FiPlus/> Add</button>
              )}
            </div>

            {researchNotes.length? researchNotes.map((n,i)=> (
              <article key={n.id} className="bg-white border rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Avatar u={n.user}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-1">
                      <span className="font-medium text-slate-900">{n.user.full_name || 'Anonymous'}</span>
                      <span>@{n.user.username}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3"/>{new Date(n.created_at).toLocaleDateString()}</span>
                      <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Note #{i+1}</span>
                    </div>
                    {editing?.type==='note' && editing.id===n.id ? (
                      <div className="space-y-2">
                        <textarea value={editing.value} onChange={e=>setEditing({ ...editing, value: e.target.value })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"/>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white"><FiCheck/> Save</button>
                          <button onClick={()=>setEditing(null)} className="px-3 py-2 rounded-lg border">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
                    )}
                  </div>
                  {(isAuthor(n.user.id) || canModerate) && !editing && (
                    <div className="flex gap-1">
                      <button onClick={()=>startEdit('note', n.id, n.content)} className="p-2 rounded-lg hover:bg-slate-100" title="Edit"><FiEdit2/></button>
                      <button onClick={()=>removeItem('note', n.id)} className="p-2 rounded-lg hover:bg-slate-100" title="Delete"><FiTrash2/></button>
                    </div>
                  )}
                </div>
              </article>
            )) : (
              <Empty state="notes" onAdd={canCreate?()=>setShowNoteModal(true):undefined} />
            )}
          </section>
        )}

        {currentSection === 'ai-copilot' && <AICopilot readme={colab.readme} colabId={colab.id} />}
        {currentSection === 'compute-sandbox' && <ComingSoon title="Compute Sandbox"/>}
        {currentSection === 'data-vault' && <ComingSoon title="Data Vault"/>}
      </main>

      {/* Floating actions on mobile */}
      {canCreate && (
        <div className="sm:hidden fixed bottom-5 right-5 z-50">
          {currentSection==='contributions' && (
            <button onClick={()=>setShowContributionModal(true)} className="w-14 h-14 rounded-full bg-green-600 text-white shadow-lg grid place-items-center"><FiPlus className="w-6 h-6"/></button>
          )}
          {currentSection==='peer-review' && (
            <button onClick={()=>setShowNoteModal(true)} className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg grid place-items-center"><FiPlus className="w-6 h-6"/></button>
          )}
        </div>
      )}

      {showContributionModal && (
        <CreateModal title="Add Contribution" placeholder="Describe your contribution…" onClose={()=>setShowContributionModal(false)} onSubmit={handleCreateContribution}/>
      )}
      {showNoteModal && (
        <CreateModal title="Add Research Note" placeholder="Add your research note…" onClose={()=>setShowNoteModal(false)} onSubmit={handleCreateNote}/>
      )}
    </div>
  )
}

/** ---------- Sections / Components ---------- */

function Overview({ colab, creator, role }: { colab: Colab; creator: Profile | null; role: string | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${colab.is_public? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{colab.is_public? <><FiGlobe/> Public</> : <><FiLock/> Private</>} </span>
          {role && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200">{role}</span>}
        </div>
        <p className="text-slate-700 whitespace-pre-wrap">{colab.description || 'A collaborative research project.'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Project Creator</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center">
              {creator?.avatar_url ? <img src={creator.avatar_url} alt="creator"/> : <span className="text-white font-bold">{creator?.full_name?.[0] || 'U'}</span>}
            </div>
            <div>
              <div className="font-semibold">{creator?.full_name || 'Unknown'}</div>
              <div className="text-sm text-slate-600">@{creator?.username || 'unknown'}</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-3">README</h3>
          {colab.readme ? (
            <div className="prose prose-slate max-w-none"><div className="whitespace-pre-wrap">{colab.readme}</div></div>
          ) : (
            <div className="text-slate-500">No README yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AICopilot({ readme, colabId }: { readme: string; colabId: string }) {
  const [input, setInput] = useStickyState<string>(
    `ai:${colabId}:draft`,
    'Summarize the current goals and suggest next steps.'
  )
  const [messages, setMessages] = useStickyState<{ role: 'user'|'assistant'; content: string }[]>(
    `ai:${colabId}:messages`,
    []
  )
  const [loading, setLoading] = useState(false)

  // --- PubMed Quick Lookup ---
  type QuickPaper = {
    pmid: string
    title: string
    journal?: string
    year?: string
    authors?: string[]
    doi?: string
    url: string
    abstract?: string
  }
  const [q, setQ] = useState('cancer immunotherapy')
  const [pmid, setPmid] = useState('')
  const [fetching, setFetching] = useState(false)
  const [paper, setPaper] = useState<QuickPaper | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const send = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt: input, colabId, readme })
      })
      const data = await res.json()
      setMessages(m => [...m, { role:'user', content: input }, { role:'assistant', content: data.text || 'No response' }])
      setInput('')
    } finally { setLoading(false) }
  }

  const clearAll = () => { setMessages([]); setInput('') }

  const fetchPubMed = async (mode: 'query' | 'pmid') => {
    setFetching(true); setErr(null)
    try {
      const body = mode === 'pmid' && pmid.trim()
        ? { pmid: pmid.trim() }
        : { query: q.trim() || 'cancer' }

      const resp = await fetch('/api/pubmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      })

      const ct = resp.headers.get('content-type') || ''
      const raw = await resp.text()
      if (!/application\/json/i.test(ct)) {
        console.error('Non-JSON from /api/pubmed:', raw.slice(0, 200))
        throw new Error('Server returned non-JSON.')
      }
      const data = JSON.parse(raw)
      if (!resp.ok) throw new Error(data?.error || 'Failed to fetch')
      setPaper(data.paper || null)
    } catch (e: any) {
      setErr(e.message || 'Failed to fetch')
      setPaper(null)
    } finally {
      setFetching(false)
    }
  }

  /* ======= Multi-Source Literature Agent (Crossref + arXiv + S2) ======= */
  type LitItem = {
    id: string
    source: 'crossref'|'arxiv'|'s2'
    title: string
    year?: number
    authors?: string[]
    abstract?: string
    doi?: string
    url?: string
    citationCount?: number
    externalIds?: Record<string, string>
  }

  const [litQ, setLitQ] = useState('large language models retrieval augmentation')
  const [litLoading, setLitLoading] = useState(false)
  const [litErr, setLitErr] = useState<string|null>(null)
  const [litItems, setLitItems] = useState<LitItem[]>([])
  const [litTop, setLitTop] = useState<LitItem[]>([])

  // Analysis UI state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisText, setAnalysisText] = useState<string>('')

  async function runMultiSearch() {
    setLitLoading(true); setLitErr(null)
    try {
      const resp = await fetch('/api/lit/multisearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: litQ, limit: 20 })
      })
      const text = await resp.text()
      if (!/application\/json/i.test(resp.headers.get('content-type')||'')) throw new Error('Non-JSON response')
      const data = JSON.parse(text)
      if (!resp.ok) throw new Error(data?.error || 'Failed search')
      setLitItems(data.items || [])
      setLitTop(data.top || [])
      setAnalysisText('') // clear previous analysis for new search
    } catch (e:any) {
      setLitErr(e.message || 'Failed search')
      setLitItems([]); setLitTop([])
    } finally {
      setLitLoading(false)
    }
  }

  function compactAuthors(a?: string[]) {
    if (!a || !a.length) return ''
    if (a.length <= 3) return a.join(', ')
    return `${a.slice(0,3).join(', ')} et al.`
  }

  function mkCiteLine(x: LitItem, idx: number) {
    const yr = x.year ? ` (${x.year})` : ''
    const src = x.source.toUpperCase()
    const doi = x.doi ? ` — doi:${x.doi}` : ''
    const url = x.url ? ` ${x.url}` : ''
    return `#${idx+1} ${x.title}${yr} — ${compactAuthors(x.authors)} [${src}]${doi}${url ? ` — ${url}` : ''}`
  }

  function mkGeminiContext(items: LitItem[], maxChars = 12000) {
    const blocks: string[] = []
    for (let i = 0; i < items.length; i++) {
      const x = items[i]
      const header = mkCiteLine(x, i)
      let abs = (x.abstract || '').trim()
      if (abs.length > 1500) abs = abs.slice(0, 1500) + '…'
      const block = `${header}\nAbstract: ${abs || 'N/A'}`
      blocks.push(block)
    }
    let out = ''
    for (const b of blocks) {
      if ((out + '\n\n' + b).length > maxChars) break
      out += (out ? '\n\n' : '') + b
    }
    return out
  }

  async function analyzeWithGemini() {
    if (!litTop.length) return
    setAnalyzing(true)
    setAnalysisText('') // reset
    try {
      const literature_context = mkGeminiContext(litTop.slice(0, 10))
      const prompt = `
You are a research scientist conducting a literature review.

Here are top papers (Crossref, arXiv, Semantic Scholar). Papers are numbered and include abstracts when available:

${literature_context}

Please provide:
1) Key breakthrough findings (cite paper numbers, e.g., #2, #5)
2) Areas of consensus vs. disagreement (cite)
3) Gaps / limitations in current research (cite)
4) Recommended next experiments or studies (cite)
5) A shortlist of 5 must-read papers with rationale

Respond concisely as a structured review with bullet points and numbered citations.
      `.trim()

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, colabId, readme })
      })
      const data = await res.json()
      const text = data?.text || 'No response'
      // Push into chat above:
      setMessages(m => [...m, { role:'user', content: `Analyze multi-source literature for: "${litQ}"` }, { role:'assistant', content: text }])
      // Also show a copy here:
      setAnalysisText(text)
    } catch (e:any) {
      setAnalysisText(`Failed to analyze: ${e.message || 'Unknown error'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6 space-y-6">
      {/* Chat-like section */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Gemini-powered assistant with project context.</div>
        <button onClick={clearAll} className="text-xs border px-2 py-1 rounded hover:bg-slate-50">Clear</button>
      </div>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg text-sm ${m.role==='user'?'bg-slate-50':'bg-blue-50'}`}>{m.content}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything…" className="flex-1 border rounded-lg px-3 py-2"/>
        <button onClick={send} disabled={loading || !input.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
          {loading? 'Thinking…':'Send'}
        </button>
      </div>
      <p className="text-xs text-slate-500">We pass README and recent contributions as context. Avoid sharing secrets in prompts.</p>

      {/* Quick PubMed (NCBI) Panel */}
      <div className="border-t pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-900 text-white text-xs">NCBI</span>
            Quick PubMed Lookup
          </h3>
          <button
            onClick={() => { setQ(''); setPmid(''); setPaper(null); setErr(null) }}
            className="text-xs border px-2 py-1 rounded hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search keywords (title/abstract)…"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={()=>fetchPubMed('query')}
              disabled={fetching || (!q.trim() && !pmid.trim())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
              title="Search by query"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={pmid}
              onChange={(e)=>setPmid(e.target.value)}
              placeholder="PMID (optional)"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={()=>fetchPubMed('pmid')}
              disabled={fetching || !pmid.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
              title="Fetch by PMID"
            >
              Fetch
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 text-sm text-red-600">{err}</div>
        )}

        {paper && (
          <article className="mt-4 bg-slate-50 border rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
              {paper.pmid && <span className="px-2 py-0.5 rounded bg-white border">PMID: {paper.pmid}</span>}
              {paper.year && <span className="px-2 py-0.5 rounded bg-white border">{paper.year}</span>}
              {paper.journal && <span className="px-2 py-0.5 rounded bg-white border">{paper.journal}</span>}
              {paper.doi && <span className="px-2 py-0.5 rounded bg-white border">DOI: {paper.doi}</span>}
            </div>
            <h4 className="font-semibold">{paper.title}</h4>
            {paper.authors?.length ? (
              <div className="text-sm text-slate-700 mt-1">{paper.authors.join(', ')}</div>
            ) : null}
            {paper.abstract ? (
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{paper.abstract}</p>
            ) : (
              <p className="text-sm text-slate-500 mt-3">No abstract available.</p>
            )}
            <div className="mt-3">
              <a href={paper.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">
                View on PubMed
              </a>
            </div>
          </article>
        )}
      </div>

      {/* === Multi-Source Literature Agent === */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Literature Agent (Crossref + arXiv + Semantic Scholar)</h3>
          <button
            onClick={() => { setLitQ(''); setLitItems([]); setLitTop([]); setLitErr(null); setAnalysisText('') }}
            className="text-xs border px-2 py-1 rounded hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              value={litQ}
              onChange={e=>setLitQ(e.target.value)}
              placeholder="e.g., graph neural networks drug discovery"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={runMultiSearch}
              disabled={litLoading || !litQ.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
              title="Search multiple sources"
            >
              {litLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={analyzeWithGemini}
              disabled={!litTop.length || analyzing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border disabled:opacity-50"
              title="Send top results to Gemini"
            >
              {analyzing ? 'Analyzing…' : 'Analyze with Gemini'}
            </button>
          </div>
        </div>

        {litErr && <div className="mt-3 text-sm text-red-600">{litErr}</div>}

        {Boolean(litTop.length) && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Top Results</h4>
            <ul className="space-y-3">
              {litTop.map((x, i) => (
                <li key={`${x.source}:${x.id}`} className="bg-slate-50 border rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1">
                    <span className="px-2 py-0.5 rounded bg-white border">#{i+1}</span>
                    {x.year && <span className="px-2 py-0.5 rounded bg-white border">{x.year}</span>}
                    <span className="px-2 py-0.5 rounded bg-white border">{x.source.toUpperCase()}</span>
                    {typeof x.citationCount === 'number' && (
                      <span className="px-2 py-0.5 rounded bg-white border">Citations: {x.citationCount}</span>
                    )}
                    {x.doi && <span className="px-2 py-0.5 rounded bg-white border">doi:{x.doi}</span>}
                  </div>
                  <div className="font-medium">{x.title}</div>
                  {x.authors?.length ? (
                    <div className="text-sm text-slate-700 mt-0.5">
                      {x.authors.length <= 3 ? x.authors.join(', ') : `${x.authors.slice(0,3).join(', ')} et al.`}
                    </div>
                  ) : null}
                  {x.abstract ? (
                    <p className="text-sm text-slate-700 mt-2 line-clamp-3">{x.abstract}</p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">No abstract available.</p>
                  )}
                  <div className="mt-2">
                    {x.url ? (
                      <a href={x.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">
                        Open
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Analysis panel */}
        {(analyzing || analysisText) && (
          <div className="mt-6 bg-white border rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-2">
              {analyzing
                ? 'Analyzing with Gemini… this can take a moment.'
                : 'Analysis ready. It has also been posted in the chat above.'}
            </div>
            {!analyzing && analysisText && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {analysisText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="bg-white border rounded-lg p-8 text-center text-slate-600">{title} — coming soon.</div>
  )
}

function Empty({ state, onAdd }: { state: 'contrib'|'notes'; onAdd?: ()=>void }) {
  const label = state==='contrib'? 'No contributions yet' : 'No research notes yet'
  return (
    <div className="bg-white border rounded-lg p-10 text-center">
      <p className="font-medium mb-2">{label}</p>
      <p className="text-slate-600 text-sm mb-4">Be the first to add one.</p>
      {onAdd && <button onClick={onAdd} className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"><FiPlus/> Add</button>}
    </div>
  )
}

function CreateModal({ title, placeholder, onClose, onSubmit }: { title:string; placeholder:string; onClose:()=>void; onSubmit:(v:string)=>Promise<void> }) {
  const [value,setValue]=useState(''); const [busy,setBusy]=useState(false)
  const submit=async(e:React.FormEvent)=>{ e.preventDefault(); if(!value.trim()) return; setBusy(true); await onSubmit(value); setBusy(false) }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-50">
      <form onSubmit={submit} className="bg-white rounded-lg w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><FiX/></button>
        </div>
        <textarea className="w-full border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500" placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
          <button type="submit" disabled={busy || !value.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{busy? 'Adding…':'Add'}</button>
        </div>
      </form>
    </div>
  )
}
