'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import {
  FiHome, FiCpu, FiUsers, FiPlus, FiX, FiCalendar,
  FiLock, FiGlobe, FiArrowLeft, FiEdit2, FiTrash2, FiCheck, FiCornerUpRight,
  FiZap, FiShield, FiBarChart2, FiArrowUp, FiDownload, FiCopy,
  FiMapPin, FiBriefcase, FiTwitter, FiLinkedin, FiGithub, FiUser
} from 'react-icons/fi'

/** ---------- Types ---------- */
interface Colab { id: string; name: string; slug: string; description: string; readme: string; is_public: boolean; owner_id: string }
interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  bio?: string
  role?: string
  institution?: string
  location?: string
  twitter_url?: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  interests?: string[]
}
interface NoteRow { id: string; colab_id: string; user_id: string; content: string; created_at: string; parent_id: string | null }
interface ResearchNote extends NoteRow { user: Profile }

type PlanTier = 'free' | 'pro' | 'team'
type UsageKind = 'ai_messages' | 'lit_searches' | 'analyses'

type RoleLabel = 'Owner' | 'Moderator' | 'Member' | 'Contributor'
interface Contributor { profile: Profile; roleLabel: RoleLabel }

/** ---------- Limits by plan (client view; enforce on server too) ---------- */
const PLAN_LIMITS: Record<PlanTier, Record<UsageKind, number>> = {
  free: { ai_messages: 150,  lit_searches: 50,   analyses: 10 },
  pro:  { ai_messages: 2000, lit_searches: 500,  analyses: 200 },
  team: { ai_messages: 10000, lit_searches: 2500, analyses: 1000 },
}

/** ---------- Helpers ---------- */
const periodKey = () => {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`
}
const titleCase = (s?: string | null): string =>
  (s || '').replace(/(^|[_\-\s])([a-z])/gi, (_, p1, p2) => (p1 ? ' ' : '') + p2.toUpperCase()) || ''

/** ---------- Usage hook (Supabase-backed per user) ---------- */
function useUsage(userId: string | null) {
  const [tier, setTier] = useState<PlanTier>('free')
  const [used, setUsed] = useState<Record<UsageKind, number>>({ ai_messages: 0, lit_searches: 0, analyses: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pKey = periodKey()

  const limits = PLAN_LIMITS[tier]
  const remaining = (k: UsageKind) => Math.max(0, (limits[k] ?? 0) - (used[k] ?? 0))
  const exceeded  = (k: UsageKind) => remaining(k) <= 0

  const refresh = async () => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const { data: planRow, error: planErr } = await supabase
        .from('user_plans')
        .select('tier')
        .eq('user_id', userId)
        .maybeSingle()
      if (planErr) throw planErr
      setTier((planRow?.tier as PlanTier) || 'free')

      const { data: usageRow, error: usageSelErr } = await supabase
        .from('user_usage_monthly')
        .select('ai_messages_used, lit_searches_used, analyses_used')
        .eq('user_id', userId)
        .eq('period', pKey)
        .maybeSingle()

      if (usageSelErr) throw usageSelErr
      if (!usageRow) {
        const { error: insErr } = await supabase
          .from('user_usage_monthly')
          .insert({ user_id: userId, period: pKey, ai_messages_used: 0, lit_searches_used: 0, analyses_used: 0 })
        if (insErr) throw insErr
        setUsed({ ai_messages: 0, lit_searches: 0, analyses: 0 })
      } else {
        setUsed({
          ai_messages: usageRow.ai_messages_used ?? 0,
          lit_searches: usageRow.lit_searches_used ?? 0,
          analyses: usageRow.analyses_used ?? 0,
        })
      }
    } catch (e:any) {
      setError(e.message || 'Failed to load usage')
    } finally {
      setLoading(false)
    }
  }

  const increment = async (kind: UsageKind, amount = 1) => {
    if (!userId) return
    try {
      const col =
        kind === 'ai_messages' ? 'ai_messages_used' :
        kind === 'lit_searches' ? 'lit_searches_used' : 'analyses_used'

      // ensure row then atomic increment via RPC
      try {
        await supabase
          .from('user_usage_monthly')
          .insert({ user_id: userId, period: pKey })
          .select('id')
          .maybeSingle()
      } catch {}

      const { error: updErr } = await supabase
        .rpc('increment_usage', { p_user_id: userId, p_period: pKey, p_column: col, p_amount: amount })
      if (updErr) throw updErr

      setUsed(prev => ({ ...prev, [kind]: (prev[kind] ?? 0) + amount }))
    } catch {
      setUsed(prev => ({ ...prev, [kind]: (prev[kind] ?? 0) + amount }))
    }
  }

  useEffect(() => { refresh() }, [userId])

  return { tier, limits, used, loading, error, remaining, exceeded, increment, periodLabel: 'this month' }
}

/** ---------- Page ---------- */
export default function ColabPage() {
  const [colab, setColab] = useState<Colab | null>(null)
  const [creator, setCreator] = useState<Profile | null>(null)
  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)

  const router = useRouter()
  const { slug } = useParams() as { slug?: string }
  const [currentSection, setCurrentSection] = useState<'overview'|'peer-review'|'contributors'|'ai-copilot'>('overview')

  const sessionUserId = sessionUser?.id || null

  const canCreate = useMemo(() => {
    if (!colab || !sessionUser) return false
    if (userRole === 'owner' || userRole === 'moderator' || userRole === 'member') return true
    // allow any signed-in user to contribute if colab is public
    return !!colab.is_public
  }, [colab, sessionUser, userRole])

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

        // Fetch creator with extended profile fields so we can show rich info
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, role, institution, location, twitter_url, linkedin_url, github_url, website_url, interests')
          .eq('id', colabData.owner_id)
          .single()
        setCreator(creatorData as Profile)

        // Current user's role in this colab
        const { data: memberRow, error: memberError } = await supabase
          .from('colab_members').select('role').eq('colab_id', colabData.id).eq('user_id', user.id).maybeSingle()
        if (!memberError) setUserRole(memberRow?.role || null)

        // All members (for contributors list)
        const { data: memberList } = await supabase
          .from('colab_members')
          .select('user_id, role, user:profiles(id, username, full_name, avatar_url, bio, institution, location, twitter_url, linkedin_url, github_url, website_url, interests)')
          .eq('colab_id', colabData.id)

        // Peer-review notes (and their authors)
        const { data: notesData } = await supabase
          .from('research_notes')
          .select('*, user:profiles(id, username, full_name, avatar_url)')
          .eq('colab_id', colabData.id)
          .order('created_at', { ascending: true })

        const notes = (notesData || []) as ResearchNote[]
        setResearchNotes(notes)

        // Build contributor set: members + all note authors + owner
        const byId = new Map<string, Contributor>()
        const memberRoleById = new Map<string, string>()

        ;(memberList || []).forEach((m: any) => {
          const p: Profile = m.user
          if (!p) return
          const roleLabel: RoleLabel =
            p.id === colabData.owner_id ? 'Owner' :
            (m.role === 'moderator' ? 'Moderator' :
              (m.role === 'member' ? 'Member' : 'Contributor'))
          byId.set(p.id, { profile: p, roleLabel })
          memberRoleById.set(p.id, m.role)
        })

        // Add owner if missing from members
        if (creatorData && !byId.has(creatorData.id)) {
          byId.set(creatorData.id, { profile: creatorData as Profile, roleLabel: 'Owner' })
        }

        // Collect note authors
        const authorIds = new Set<string>()
        for (const n of notes) {
          const uid = n.user?.id || n.user_id
          if (uid) authorIds.add(uid)
        }
        // Fetch extended profiles for note authors not already in byId
        const extraIds = Array.from(authorIds).filter(id => !byId.has(id))
        if (extraIds.length) {
          const { data: extraProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio, institution, location, twitter_url, linkedin_url, github_url, website_url, interests')
            .in('id', extraIds)
          ;(extraProfiles || []).forEach((p: any) => {
            const roleLabel: RoleLabel = p.id === colabData.owner_id ? 'Owner' : 'Contributor'
            byId.set(p.id, { profile: p as Profile, roleLabel })
          })
        }

        // Normalize roles (ensure owner labeled Owner even if member says 'moderator' etc.)
        if (colabData.owner_id && byId.has(colabData.owner_id)) {
          const ownerC = byId.get(colabData.owner_id)!
          byId.set(colabData.owner_id, { ...ownerC, roleLabel: 'Owner' })
        }

        // Sort: Owner → Moderator → Member → Contributor → name
        const order: Record<RoleLabel, number> = { Owner: 0, Moderator: 1, Member: 2, Contributor: 3 }
        const list = Array.from(byId.values())
          .sort((a, b) => (order[a.roleLabel] - order[b.roleLabel]) || (a.profile.full_name || a.profile.username).localeCompare(b.profile.full_name || b.profile.username))

        setContributors(list)
      } catch (err: any) {
        setError(err.message || 'Failed to load colab')
      } finally { setLoading(false) }
    }
    fetchData()
  }, [slug, router])

  const handleCreateNote = async (content: string, parentId: string | null = null) => {
    if (!colab || !sessionUser) return
    const { data, error } = await supabase
      .from('research_notes')
      .insert({ colab_id: colab.id, user_id: sessionUser.id, content, parent_id: parentId })
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .single()
    if (!error && data) {
      setResearchNotes(prev => [...prev, data as ResearchNote])

      // ensure the posting user shows as contributor
      if (!contributors.find(c => c.profile.id === sessionUser.id)) {
        // fetch full profile once, with rich fields
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, institution, location, twitter_url, linkedin_url, github_url, website_url, interests')
          .eq('id', sessionUser.id)
          .single()
        if (prof) {
          const roleLabel: RoleLabel =
            sessionUser.id === colab.owner_id ? 'Owner' :
            (userRole === 'moderator' ? 'Moderator' :
              (userRole === 'member' ? 'Member' : 'Contributor'))
          setContributors(prev => [...prev, { profile: prof as Profile, roleLabel }])
        }
      }
    }
    setShowNoteModal(false)
  }

  const startEdit = (id: string, value: string) => setEditing({ id, value })
  const saveEdit = async () => {
    if (!editing) return
    const { data } = await supabase
      .from('research_notes')
      .update({ content: editing.value })
      .eq('id', editing.id)
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .single()
    if (data) setResearchNotes(prev => prev.map(n => n.id === editing.id ? (data as ResearchNote) : n))
    setEditing(null)
  }

  // Delete a note and descendants
  const removeNote = async (id: string) => {
    const childMap: Record<string, string[]> = {}
    for (const n of researchNotes) {
      if (n.parent_id) {
        if (!childMap[n.parent_id]) childMap[n.parent_id] = []
        childMap[n.parent_id].push(n.id)
      }
    }
    const toDelete = new Set<string>([id])
    const queue = [id]
    while (queue.length) {
      const cur = queue.shift()!
      const kids = childMap[cur] || []
      for (const k of kids) {
        if (!toDelete.has(k)) { toDelete.add(k); queue.push(k) }
      }
    }
    try {
      await supabase.from('research_notes').delete().in('id', Array.from(toDelete))
    } catch {
      await supabase.from('research_notes').delete().eq('id', id)
    }
    setResearchNotes(prev => prev.filter(n => !toDelete.has(n.id)))
  }

  /** --- Build threaded tree --- */
  const childrenMap = useMemo(() => {
    const map: Record<string, ResearchNote[]> = {}
    for (const n of researchNotes) {
      const pid = n.parent_id || '__root__'
      if (!map[pid]) map[pid] = []
      map[pid].push(n)
    }
    Object.values(map).forEach(list =>
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    )
    return map
  }, [researchNotes])
  const rootNotes = childrenMap['__root__'] || []

  /** ---------- Render ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="animate-pulse text-slate-600">Loading collaboration…</div>
      </div>
    )
  }
  if (error || !colab) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="bg-white border rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-3">{error || 'Colab not found'}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white">
            <FiArrowLeft/> Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: FiHome, count: null },
    { id: 'peer-review', label: 'Peer Review', icon: FiUsers, count: researchNotes.length },
    { id: 'contributors', label: 'Contributors', icon: FiUser, count: contributors.length },
    { id: 'ai-copilot', label: 'AI Co-Pilot', icon: FiCpu, count: null },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur sticky top-0 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <FiArrowLeft/> <span className="hidden sm:inline">Dashboard</span>
          </Link>
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
          <div className="w-10" />
        </div>
        <div className="border-t">
          <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-1">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(s.id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm border-b-2 whitespace-nowrap ${currentSection===s.id?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:text-slate-900'}`}>
                  <s.icon className="w-4 h-4"/> {s.label}
                  {s.count ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${currentSection===s.id?'bg-blue-100 text-blue-800':'bg-slate-100 text-slate-600'}`}>
                      {s.count}
                    </span>
                  ) : null}
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

        {currentSection === 'peer-review' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Peer Review</h2>
              {canCreate && (
                <button
                  onClick={()=>setShowNoteModal(true)}
                  className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                  <FiPlus/> New thread
                </button>
              )}
            </div>

            {rootNotes.length ? (
              <ul className="space-y-3">
                {rootNotes.map((n) => (
                  <ThreadNode
                    key={n.id}
                    node={n}
                    childrenMap={childrenMap}
                    depth={0}
                    sessionUserId={sessionUserId}
                    onReply={(parentId, text)=>handleCreateNote(text, parentId)}
                    onRequestEdit={startEdit}
                    onRequestDelete={removeNote}
                    editingId={editing?.id || null}
                    editingValue={editing?.value || ''}
                    onEditingChange={(v)=>setEditing(p=>p?{...p, value:v}:p)}
                    onSaveEdit={saveEdit}
                  />
                ))}
              </ul>
            ) : (
              <Empty state="notes" onAdd={canCreate ? ()=>setShowNoteModal(true):undefined} />
            )}
          </section>
        )}

        {currentSection === 'contributors' && (
          <ContributorsSection
            contributors={contributors}
            onPreview={(p)=>setPreviewProfile(p)}
          />
        )}

        {currentSection === 'ai-copilot' && (
          <AICopilot
            readme={colab.readme}
            colabId={colab.id}
            userId={sessionUserId}
          />
        )}
      </main>

      {/* FAB mobile */}
      {canCreate && currentSection==='peer-review' && (
        <div className="sm:hidden fixed bottom-5 right-5 z-50">
          <button
            onClick={()=>setShowNoteModal(true)}
            className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg grid place-items-center">
            <FiPlus className="w-6 h-6"/>
          </button>
        </div>
      )}

      {showNoteModal && (
        <CreateModal
          title="Start a new thread"
          placeholder="Write your review or question…"
          onClose={()=>setShowNoteModal(false)}
          onSubmit={(v)=>handleCreateNote(v, null)}
        />
      )}

      {previewProfile && (
        <ProfilePreviewModal profile={previewProfile} onClose={()=>setPreviewProfile(null)} />
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
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${colab.is_public? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            {colab.is_public? <><FiGlobe/> Public</> : <><FiLock/> Private</>}
          </span>
          {role && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200">{role}</span>}
        </div>
        <p className="text-slate-700 whitespace-pre-wrap break-words">{colab.description || 'A collaborative research project.'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Project Creator</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center">
              {creator?.avatar_url ? <img src={creator.avatar_url} alt="creator" className="w-full h-full object-cover"/> : <span className="text-white font-bold">{creator?.full_name?.[0] || 'U'}</span>}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{creator?.full_name || 'Unknown'}</div>
              <div className="text-sm text-slate-600 truncate">@{creator?.username || 'unknown'}</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-3">README</h3>
          {colab.readme ? (
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap break-words">{colab.readme}</div>
            </div>
          ) : (
            <div className="text-slate-500">No README yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Contributors ---------- */
function ContributorsSection({
  contributors,
  onPreview
}: {
  contributors: Contributor[],
  onPreview: (p: Profile) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contributors</h2>
        <div className="text-sm text-slate-600">{contributors.length} people</div>
      </div>

      {contributors.length === 0 ? (
        <div className="bg-white border rounded-lg p-10 text-center">
          <p className="font-medium mb-2">No contributors yet</p>
          <p className="text-slate-600 text-sm">Start a thread in Peer Review to appear here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contributors.map(({ profile, roleLabel }) => (
            <li key={profile.id} className="bg-white border rounded-lg p-4 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center shrink-0">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.full_name || profile.username} className="w-full h-full object-cover"/>
                    : <span className="text-white font-semibold">{(profile.full_name?.[0] || profile.username?.[0] || 'U').toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{profile.full_name || 'Anonymous'}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleLabel==='Owner' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                      roleLabel==='Moderator' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                      roleLabel==='Member' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                      'bg-slate-50 border-slate-200 text-slate-700'}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 truncate">@{profile.username}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5"/>{profile.location}</span>
                    )}
                    {profile.institution && (
                      <span className="inline-flex items-center gap-1"><FiBriefcase className="w-3.5 h-3.5"/>{profile.institution}</span>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-slate-700 line-clamp-3">{profile.bio}</p>
              )}

              {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.interests.slice(0,3).map((i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">{i}</span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 text-slate-600">
                {profile.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noreferrer" className="hover:text-slate-900" title="Twitter"><FiTwitter/></a>}
                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-slate-900" title="LinkedIn"><FiLinkedin/></a>}
                {profile.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="hover:text-slate-900" title="GitHub"><FiGithub/></a>}
                {profile.website_url && <a href={profile.website_url} target="_blank" rel="noreferrer" className="hover:text-slate-900" title="Website"><FiGlobe/></a>}
              </div>

              <div className="mt-4">
                <button
                  onClick={()=>onPreview(profile)}
                  className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-slate-50">
                  View profile
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProfilePreviewModal({ profile, onClose }: { profile: Profile, onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name || profile.username} className="w-full h-full object-cover"/>
                : <span className="text-white font-semibold">{(profile.full_name?.[0] || profile.username?.[0] || 'U').toUpperCase()}</span>}
            </div>
            <div>
              <div className="font-semibold">{profile.full_name || 'Anonymous'}</div>
              <div className="text-xs text-slate-600">@{profile.username}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><FiX/></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
            {profile.location && <span className="inline-flex items-center gap-2"><FiMapPin/>{profile.location}</span>}
            {profile.institution && <span className="inline-flex items-center gap-2"><FiBriefcase/>{profile.institution}</span>}
          </div>

          {profile.bio && (
            <div>
              <h4 className="text-sm font-semibold mb-1">About</h4>
              <p className="text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">{i}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-1">Links</h4>
            <div className="flex items-center gap-3 text-slate-700">
              {profile.twitter_url ? <a href={profile.twitter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><FiTwitter/> Twitter</a> : <span className="text-slate-400">Twitter —</span>}
              {profile.linkedin_url ? <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><FiLinkedin/> LinkedIn</a> : <span className="text-slate-400">LinkedIn —</span>}
              {profile.github_url ? <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><FiGithub/> GitHub</a> : <span className="text-slate-400">GitHub —</span>}
              {profile.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><FiGlobe/> Website</a> : <span className="text-slate-400">Website —</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Threaded Review UI ---------- */
function ThreadNode({
  node, childrenMap, depth,
  sessionUserId,
  onReply, onRequestEdit, onRequestDelete,
  editingId, editingValue, onEditingChange, onSaveEdit
}: {
  node: ResearchNote
  childrenMap: Record<string, ResearchNote[]>
  depth: number
  sessionUserId: string | null
  onReply: (parentId: string, text: string) => Promise<void>
  onRequestEdit: (id: string, currentValue: string) => void
  onRequestDelete: (id: string) => void
  editingId: string | null
  editingValue: string
  onEditingChange: (v: string) => void
  onSaveEdit: () => Promise<void>
}) {
  const [replying, setReplying] = useState(false)
  const [reply, setReply] = useState('')

  const kids = childrenMap[node.id] || []
  const isMine = sessionUserId === node.user_id
  const canEditDelete = isMine
  const isEditing = editingId === node.id

  return (
    <li className="bg-white border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center overflow-hidden shrink-0">
          {node.user?.avatar_url
            ? <img src={node.user.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
            : <span className="text-white font-semibold">{node.user?.full_name?.[0] || 'U'}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-1">
            <span className="font-medium text-slate-900 truncate">{node.user?.full_name || 'Anonymous'}</span>
            <span className="truncate">@{node.user?.username}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3"/>{new Date(node.created_at).toLocaleDateString()}</span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingValue}
                onChange={e=>onEditingChange(e.target.value)}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 whitespace-pre-wrap break-words"
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={onSaveEdit} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white">
                  <FiCheck/> Save
                </button>
                <button onClick={()=>onEditingChange(node.content)} className="px-3 py-2 rounded-lg border">Reset</button>
              </div>
            </div>
          ) : (
            <p className="text-slate-700 whitespace-pre-wrap break-words">{node.content}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button onClick={()=>setReplying(v=>!v)} className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50">
              <FiCornerUpRight/> Reply
            </button>
            {canEditDelete && !isEditing && (
              <>
                <button
                  onClick={()=>onRequestEdit(node.id, node.content)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50">
                  <FiEdit2/> Edit
                </button>
                <button
                  onClick={()=>onRequestDelete(node.id)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 text-red-600">
                  <FiTrash2/> Delete
                </button>
              </>
            )}
          </div>

          {replying && (
            <div className="mt-3">
              <textarea
                value={reply}
                onChange={e=>setReply(e.target.value)}
                placeholder="Write a reply…"
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 whitespace-pre-wrap break-words"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={async()=>{ if(!reply.trim()) return; await onReply(node.id, reply.trim()); setReply(''); setReplying(false) }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white"
                >
                  <FiPlus/> Post reply
                </button>
                <button onClick={()=>setReplying(false)} className="px-3 py-2 rounded-lg border">Cancel</button>
              </div>
            </div>
          )}

          {kids.length > 0 && (
            <ul className="mt-4 space-y-3 border-l pl-4">
              {kids.map(child => (
                <ThreadNode
                  key={child.id}
                  node={child}
                  childrenMap={childrenMap}
                  depth={depth+1}
                  sessionUserId={sessionUserId}
                  onReply={onReply}
                  onRequestEdit={onRequestEdit}
                  onRequestDelete={onRequestDelete}
                  editingId={editingId}
                  editingValue={editingValue}
                  onEditingChange={onEditingChange}
                  onSaveEdit={onSaveEdit}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

/* ---------- Helper: nicely format AI text ---------- */
function FormattedText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n+/)
  const isBullet = (line: string) => /^(?:\d+[\.)]|[-*•])\s+/.test(line.trim())
  return (
    <div className="prose prose-sm max-w-none break-words">
      {blocks.map((block, idx) => {
        const lines = block.split(/\n/)
        const bulletLines = lines.every(l => l.trim() === '' || isBullet(l))
        if (bulletLines) {
          return (
            <ul key={idx} className="space-y-2">
              {lines.filter(l => l.trim()).map((l, i) => (
                <li key={i}>{l.replace(/^(\d+[\.)]|[-*•])\s+/, '')}</li>
              ))}
            </ul>
          )
        }
        return <p key={idx} className="mb-4 whitespace-pre-wrap break-words">{block}</p>
      })}
    </div>
  )
}

/* ---------- AI Co-Pilot (README-only) + Supabase Chat+Memory (per user) + Usage gating ---------- */
function AICopilot({ readme, colabId, userId }: { readme: string; colabId: string; userId: string | null }) {
  const [input, setInput] = useState('Summarize the README and suggest next steps.')
  const [messages, setMessages] = useState<{ role: 'user'|'assistant'; content: string }[]>([])
  const [litMemory, setLitMemory] = useState<string>('') // per user+colab
  const [loading, setLoading] = useState(false)
  const { tier, limits, used, remaining, exceeded, increment, periodLabel } = useUsage(userId)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const [chatId, setChatId] = useState<string | null>(null)
  const [persistReady, setPersistReady] = useState(false)
  const [analysisReady, setAnalysisReady] = useState(false)

  const chatRef = useRef<HTMLDivElement | null>(null)
  const scrollToChat = () => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Load/create per-user chat + memory
  useEffect(() => {
    (async () => {
      if (!userId || !colabId) return
      try {
        const { data: existing, error: selErr } = await supabase
          .from('ai_chats')
          .select('id')
          .eq('colab_id', colabId)
          .eq('user_id', userId)
          .maybeSingle()
        if (selErr) throw selErr
        let cid = existing?.id
        if (!cid) {
          const { data: created, error: insErr } = await supabase
            .from('ai_chats')
            .insert({ colab_id: colabId, user_id: userId })
            .select('id')
            .single()
          if (insErr) throw insErr
          cid = created.id
        }
        setChatId(cid || null)

        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('role, content, created_at')
          .eq('chat_id', cid)
          .order('created_at', { ascending: true })
          .limit(200)
        if (Array.isArray(msgs)) {
          setMessages(msgs.map(m => ({ role: m.role as 'user'|'assistant', content: m.content })))
        }

        const { data: mem } = await supabase
          .from('ai_memories')
          .select('content')
          .eq('user_id', userId)
          .eq('colab_id', colabId)
          .eq('type', 'literature')
          .maybeSingle()
        if (mem?.content) setLitMemory(mem.content)

        setPersistReady(true)
      } catch {
        setPersistReady(false)
      }
    })()
  }, [userId, colabId])

  async function appendMessage(role: 'user'|'assistant', content: string) {
    setMessages(m => [...m, { role, content }])
    if (persistReady && chatId) {
      try { await supabase.from('ai_messages').insert({ chat_id: chatId, role, content }) } catch {}
    }
  }
  async function saveMemory(content: string) {
    setLitMemory(content)
    if (persistReady && userId) {
      try {
        await supabase.from('ai_memories').upsert(
          { user_id: userId, colab_id: colabId, type: 'literature', content },
          { onConflict: 'user_id,colab_id,type' }
        )
      } catch {}
    }
  }
  async function clearChatOnly() {
    setMessages([])
    if (persistReady && chatId) {
      try { await supabase.from('ai_messages').delete().eq('chat_id', chatId) } catch {}
    }
    setTimeout(() => chatRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }), 50)
  }
  async function clearChatAndMemory() {
    setMessages([])
    setLitMemory('')
    if (persistReady && chatId && userId) {
      try { await supabase.from('ai_messages').delete().eq('chat_id', chatId) } catch {}
      try { await supabase.from('ai_memories').delete().eq('user_id', userId).eq('colab_id', colabId).eq('type', 'literature') } catch {}
    }
    setTimeout(() => chatRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }), 50)
  }

  // Always include README + memory in context
  function makeAIPayload(userPrompt: string) {
    const contextBits: string[] = []
    if (readme?.trim()) contextBits.push(`README:\n${readme.trim()}`)
    if (litMemory?.trim()) contextBits.push(`LATEST_LIT_ANALYSIS:\n${litMemory.trim()}`)
    return {
      prompt: userPrompt,
      colabId,
      readme: contextBits.join('\n\n'),
      history: messages.slice(-12),
    }
  }

  const send = async () => {
    if (!input.trim()) return
    if (exceeded('ai_messages')) { setShowUpgrade(true); return }
    setLoading(true)
    try {
      await appendMessage('user', input)
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(makeAIPayload(input))
      })
      const data = await res.json()
      const bot = data?.text || 'No response'
      await appendMessage('assistant', bot)
      increment('ai_messages', 1)
      setInput('')
      setTimeout(scrollToChat, 150)
    } finally { setLoading(false) }
  }

  // PubMed + Literature Agent
  type QuickPaper = { pmid: string; title: string; journal?: string; year?: string; authors?: string[]; doi?: string; url: string; abstract?: string }
  const [q, setQ] = useState('cancer immunotherapy')
  const [pmid, setPmid] = useState('')
  const [fetching, setFetching] = useState(false)
  const [paper, setPaper] = useState<QuickPaper | null>(null)
  const [err, setErr] = useState<string | null>(null)

  type LitItem = { id: string; source: 'crossref'|'arxiv'|'s2'; title: string; year?: number; authors?: string[]; abstract?: string; doi?: string; url?: string; citationCount?: number; externalIds?: Record<string, string> }
  const [litQ, setLitQ] = useState('large language models retrieval augmentation')
  const [litLoading, setLitLoading] = useState(false)
  const [litErr, setLitErr] = useState<string|null>(null)
  const [litTop, setLitTop] = useState<LitItem[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  const compactAuthors = (a?: string[]) => !a?.length ? '' : (a.length <= 3 ? a.join(', ') : `${a.slice(0,3).join(', ')} et al.`)
  const mkCiteLine = (x: LitItem, idx:number) => {
    const yr = x.year ? ` (${x.year})` : ''; const src = x.source.toUpperCase(); const doi = x.doi ? ` — doi:${x.doi}` : ''; const url = x.url ? ` ${x.url}` : ''
    return `#${idx+1} ${x.title}${yr} — ${compactAuthors(x.authors)} [${src}]${doi}${url ? ` — ${url}` : ''}`
  }
  function mkGeminiContext(items: LitItem[], maxChars = 12000) {
    const blocks: string[] = []
    for (let i=0;i<items.length;i++){
      const x = items[i]
      const header = mkCiteLine(x, i)
      let abs = (x.abstract || '').trim()
      if (abs.length > 1500) abs = abs.slice(0, 1500) + '…'
      blocks.push(`${header}\nAbstract: ${abs || 'N/A'}`)
    }
    let out = ''
    for (const b of blocks) { if ((out + '\n\n' + b).length > maxChars) break; out += (out ? '\n\n' : '') + b }
    return out
  }

  const fetchPubMed = async (mode: 'query'|'pmid') => {
    if (exceeded('lit_searches')) { setShowUpgrade(true); return }
    setFetching(true); setErr(null)
    try {
      const body = mode === 'pmid' && pmid.trim() ? { pmid: pmid.trim() } : { query: q.trim() || 'cancer' }
      const resp = await fetch('/api/pubmed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept':'application/json' }, body: JSON.stringify(body) })
      const ct = resp.headers.get('content-type') || ''; const raw = await resp.text()
      if (!/application\/json/i.test(ct)) throw new Error('Non-JSON response')
      const data = JSON.parse(raw); if (!resp.ok) throw new Error(data?.error || 'Failed to fetch')
      setPaper(data.paper || null)
      increment('lit_searches', 1)
    } catch (e:any) { setErr(e.message || 'Failed to fetch'); setPaper(null) }
    finally { setFetching(false) }
  }

  async function runMultiSearch() {
    if (exceeded('lit_searches')) { setShowUpgrade(true); return }
    setLitLoading(true); setLitErr(null)
    try {
      const resp = await fetch('/api/lit/multisearch', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ query: litQ, limit: 20 }) })
      const text = await resp.text()
      if (!/application\/json/i.test(resp.headers.get('content-type')||'')) throw new Error('Non-JSON response')
      const data = JSON.parse(text); if (!resp.ok) throw new Error(data?.error || 'Failed search')
      setLitTop(data.top || [])
      increment('lit_searches', 1)
    } catch (e:any) { setLitErr(e.message || 'Failed search'); setLitTop([]) }
    finally { setLitLoading(false) }
  }

  async function analyzeWithGemini() {
    if (!litTop.length) return
    if (exceeded('analyses')) { setShowUpgrade(true); return }
    setAnalyzing(true)
    try {
      const literature_context = mkGeminiContext(litTop.slice(0, 10))
      const prompt = `
You are a research scientist conducting a literature review.

Here are top papers (Crossref, arXiv, Semantic Scholar). Papers are numbered and include abstracts when available:

${literature_context}

Please provide:
1) Key breakthrough findings (cite paper numbers)
2) Areas of consensus vs. disagreement (cite)
3) Gaps / limitations (cite)
4) Recommended next experiments (cite)
5) Shortlist of 5 must-read papers with rationale

Respond as bullet points with #numbers.
`.trim()

      await appendMessage('user', `Analyze multi-source literature for: "${litQ}"`)
      const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(makeAIPayload(prompt)) })
      const data = await res.json()
      const text = data?.text || 'No response'
      await appendMessage('assistant', text)
      await saveMemory(text)
      increment('analyses', 1)
      setAnalysisReady(true)
      setAnalyzing(false)
      setTimeout(scrollToChat, 250)
    } catch (e:any) {
      setAnalyzing(false); setAnalysisReady(false)
      await appendMessage('assistant', `Failed to analyze: ${e?.message || 'Unknown error'}`)
      setTimeout(scrollToChat, 150)
    }
  }

  // Extras
  const exportChat = () => {
    const blob = new Blob([JSON.stringify({ colabId, messages, litMemory, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `chat-${colabId}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const copyLastAI = async () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant')
    if (last?.content) await navigator.clipboard.writeText(last.content)
  }

  const Meter = ({ label, used, total }: { label:string; used:number; total:number }) => {
    const pct = Math.min(100, Math.round((used / Math.max(1,total)) * 100))
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span>{used}/{total}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6 space-y-6">
      {/* Plan + usage header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-slate-50">
            <FiShield className="w-3.5 h-3.5" /> {tier.toUpperCase()}
          </span>
          <span className="hidden sm:inline">Generous free tier · Fair usage applies ({periodLabel}).</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportChat} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50" title="Export chat">
            <FiDownload /> Export
          </button>
          <button onClick={copyLastAI} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50" title="Copy last AI answer">
            <FiCopy /> Copy last AI
          </button>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50">
            <FiZap /> Upgrade
          </Link>
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Meter label="AI messages" used={used.ai_messages} total={limits.ai_messages} />
        <Meter label="Literature searches" used={used.lit_searches} total={limits.lit_searches} />
        <Meter label="Analyses" used={used.analyses} total={limits.analyses} />
      </div>

      {/* Chat header with Clear */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Chat with AI
          {litMemory ? <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 border">lit. analysis in memory</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChatOnly}
            className="text-xs border px-2 py-1 rounded hover:bg-slate-50"
            title="Clear chat only"
          >
            Clear chat
          </button>
          <button
            onClick={clearChatAndMemory}
            className="text-xs border px-2 py-1 rounded hover:bg-slate-50"
            title="Clear chat + forget memory"
          >
            Clear + forget
          </button>
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} className="space-y-3 max-h-[50vh] overflow-y-auto scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg text-sm break-words ${m.role==='user'?'bg-slate-50':'bg-blue-50'}`}>
            {m.role === 'assistant' ? (
              <>
                <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                  <FiCpu className="w-3 h-3" /><span>AI</span>
                </div>
                <FormattedText text={m.content} />
              </>
            ) : (
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder={exceeded('ai_messages') ? 'Limit reached — upgrade to continue' : 'Ask anything…'}
          disabled={exceeded('ai_messages')}
          className="flex-1 border rounded-lg px-3 py-2 min-w-0 disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim() || exceeded('ai_messages')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
        >
          {loading? 'Thinking…':'Send'}
        </button>
      </div>
      <p className="text-xs text-slate-500">We pass README + your latest literature analysis into the AI for context. Avoid sharing secrets.</p>

      {/* Quick PubMed */}
      <div className="border-t pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-900 text-white text-xs">NCBI</span>
            Quick PubMed Lookup
          </h3>
          <button onClick={() => { setQ(''); setPmid(''); setPaper(null); setErr(null) }} className="text-xs border px-2 py-1 rounded hover:bg-slate-50">Reset</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder={exceeded('lit_searches') ? 'Limit reached — upgrade to continue' : 'Search keywords (title/abstract)…'}
              disabled={exceeded('lit_searches')}
              className="flex-1 border rounded-lg px-3 py-2 min-w-0 disabled:opacity-60"
            />
            <button
              onClick={()=>fetchPubMed('query')}
              disabled={fetching || exceeded('lit_searches') || (!q.trim() && !pmid.trim())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
              title="Search by query"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input value={pmid} onChange={(e)=>setPmid(e.target.value)} placeholder="PMID (optional)" className="flex-1 border rounded-lg px-3 py-2 min-w-0" />
            <button
              onClick={()=>fetchPubMed('pmid')}
              disabled={fetching || exceeded('lit_searches') || !pmid.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border disabled:opacity-50"
              title="Fetch by PMID"
            >
              Fetch
            </button>
          </div>
        </div>

        {err && <div className="mt-3 text-sm text-red-600 break-words">{err}</div>}
        {paper && (
          <article className="mt-4 bg-slate-50 border rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
              {paper.pmid && <span className="px-2 py-0.5 rounded bg-white border">PMID: {paper.pmid}</span>}
              {paper.year && <span className="px-2 py-0.5 rounded bg-white border">{paper.year}</span>}
              {paper.journal && <span className="px-2 py-0.5 rounded bg-white border">{paper.journal}</span>}
              {paper.doi && <span className="px-2 py-0.5 rounded bg-white border break-words">DOI: {paper.doi}</span>}
            </div>
            <h4 className="font-semibold">{paper.title}</h4>
            {paper.authors?.length ? <div className="text-sm text-slate-700 mt-1 break-words">{paper.authors.join(', ')}</div> : null}
            {paper.abstract ? <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap break-words">{paper.abstract}</p> : <p className="text-sm text-slate-500 mt-3">No abstract available.</p>}
            <div className="mt-3">
              <a href={paper.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-words">View on PubMed</a>
            </div>
          </article>
        )}
      </div>

      {/* Literature Agent */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><FiBarChart2 className="w-4 h-4" /> Literature Agent (Crossref + arXiv + S2)</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { setLitQ(''); setLitTop([]); setLitErr(null); setAnalysisReady(false) }} className="text-xs border px-2 py-1 rounded hover:bg-slate-50">Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              value={litQ}
              onChange={e=>setLitQ(e.target.value)}
              placeholder={exceeded('lit_searches') ? 'Limit reached — upgrade to continue' : 'e.g., graph neural networks drug discovery'}
              disabled={exceeded('lit_searches')}
              className="flex-1 border rounded-lg px-3 py-2 min-w-0 disabled:opacity-60"
            />
            <button
              onClick={runMultiSearch}
              disabled={litLoading || !litQ.trim() || exceeded('lit_searches')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
              title="Search multiple sources"
            >
              {litLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={analysisReady ? scrollToChat : analyzeWithGemini}
              disabled={(!litTop.length && !analysisReady) || analyzing || exceeded('analyses')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border disabled:opacity-50 ${analysisReady ? 'bg-blue-600 text-white border-blue-600' : ''}`}
              title={analysisReady ? 'Jump to chat' : 'Send top results to AI'}
            >
              {analyzing ? 'Analyzing…' : (analysisReady ? <>View chat <FiArrowUp /></> : 'Analyze with AI')}
            </button>
          </div>
        </div>

        {litErr && <div className="mt-3 text-sm text-red-600 break-words">{litErr}</div>}

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
                    {typeof x.citationCount === 'number' && <span className="px-2 py-0.5 rounded bg-white border">Citations: {x.citationCount}</span>}
                    {x.doi && <span className="px-2 py-0.5 rounded bg-white border break-words">doi:{x.doi}</span>}
                  </div>
                  <div className="font-medium break-words">{x.title}</div>
                  {x.authors?.length ? <div className="text-sm text-slate-700 mt-0.5 break-words">{x.authors.length <= 3 ? x.authors.join(', ') : `${x.authors.slice(0,3).join(', ')} et al.`}</div> : null}
                  {x.abstract ? <p className="text-sm text-slate-700 mt-2 line-clamp-3 break-words">{x.abstract}</p> : <p className="text-sm text-slate-500 mt-2">No abstract available.</p>}
                  <div className="mt-2">{x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-words">Open</a> : null}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysisReady && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 text-green-800 p-3 flex items-center justify-between" role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <FiCheck className="shrink-0" />
              <span>Literature review analysis posted to chat. Ask follow-ups and I'll remember.</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={scrollToChat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                View chat <FiArrowUp />
              </button>
              <button onClick={()=>setAnalysisReady(false)} className="p-1 rounded hover:bg-green-100" aria-label="Dismiss" title="Dismiss">
                <FiX />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          tier={tier}
          remaining={{
            ai: remaining('ai_messages'),
            search: remaining('lit_searches'),
            analyses: remaining('analyses'),
          }}
          onClose={()=>setShowUpgrade(false)}
        />
      )}
    </div>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="bg-white border rounded-lg p-8 text-center text-slate-600">{title} — coming soon.</div>
  )
}

function Empty({ state, onAdd }: { state: 'notes'; onAdd?: ()=>void }) {
  return (
    <div className="bg-white border rounded-lg p-10 text-center">
      <p className="font-medium mb-2">No threads yet</p>
      <p className="text-slate-600 text-sm mb-4">Start the first discussion.</p>
      {onAdd && <button onClick={onAdd} className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"><FiPlus/> New thread</button>}
    </div>
  )
}

function CreateModal({ title, placeholder, onClose, onSubmit }: { title:string; placeholder:string; onClose:()=>void; onSubmit:(v:string)=>Promise<void> }) {
  const [value,setValue]=useState(''); const [busy,setBusy]=useState(false)
  const submit=async(e:FormEvent)=>{ e.preventDefault(); if(!value.trim()) return; setBusy(true); await onSubmit(value.trim()); setBusy(false) }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-50">
      <form onSubmit={submit} className="bg-white rounded-lg w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><FiX/></button>
        </div>
        <textarea className="w-full border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-500 whitespace-pre-wrap break-words" placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
          <button type="submit" disabled={busy || !value.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">{busy? 'Posting…':'Post'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------- Upgrade Modal ---------- */
function UpgradeModal({
  tier, remaining, onClose
}: {
  tier: PlanTier,
  remaining: { ai:number; search:number; analyses:number },
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiZap className="text-yellow-500" />
            <h3 className="font-semibold">Upgrade for higher limits</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <FiX />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-slate-700">
            You're on the <strong>{tier.toUpperCase()}</strong> plan. You've reached a limit for one of the features.
          </p>
          <ul className="text-sm text-slate-700 space-y-2">
            <li>• AI messages remaining: <strong>{remaining.ai}</strong></li>
            <li>• Literature searches remaining: <strong>{remaining.search}</strong></li>
            <li>• Analyses remaining: <strong>{remaining.analyses}</strong></li>
          </ul>
          <div className="bg-slate-50 border rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Why upgrade?</p>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✓ Bigger monthly limits + priority models</li>
              <li>✓ Faster lanes during peak usage</li>
              <li>✓ Team seats & collaboration controls</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/pricing" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Explore plans
            </Link>
            <Link href="/billing" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-slate-50">
              Manage billing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
