'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase' // ← adjust if your path differs
import {
  FiShield, FiZap, FiCheck, FiX, FiArrowLeft, FiInfo,
  FiMessageSquare, FiSearch, FiBarChart2, FiUsers, FiFolderPlus, FiTarget
} from 'react-icons/fi'

/** ------------------------------------------------------
 * STRATEGIC PLAN DESIGN — Only 2 tiers: FREE and PRO
 * Keep these numbers in sync with your server checks.
 * (client view; enforce on server/API as source of truth)
 * ----------------------------------------------------- */
type PlanTier = 'free' | 'pro'
type UsageKind = 'ai_messages' | 'lit_searches' | 'analyses'

const PLAN_LIMITS: Record<PlanTier, Record<UsageKind, number>> = {
  free: { ai_messages: 150,  lit_searches: 50,  analyses: 10 },
  pro:  { ai_messages: 2000, lit_searches: 500, analyses: 200 },
}

/** Additional collaboration/challenge rules (non-metered) */
const PLAN_RULES = {
  free: {
    colabs_create_max: 3,        // how many colabs a free user can create (owner)
    colabs_contribute_max: 10,   // how many colabs a free user can be a member/contributor in
    challenges_create: 'Yes — 1 active challenge at a time',
  },
  pro: {
    colabs_create_max: Infinity, // unlimited
    colabs_contribute_max: Infinity,
    challenges_create: 'Yes — unlimited active challenges',
  }
}

/** ---------------- Helper ---------------- */
const niceCount = (n: number) => (n === Infinity ? 'Unlimited' : String(n))
const periodKey = () => {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`
}

/** ---------------- Usage hook (same pattern as your Colab page) ---------------- */
function useUsage(userId: string | null) {
  const [tier, setTier] = useState<PlanTier>('free')
  const [used, setUsed] = useState<Record<UsageKind, number>>({
    ai_messages: 0, lit_searches: 0, analyses: 0
  })
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
      // plan
      const { data: planRow, error: planErr } = await supabase
        .from('user_plans')
        .select('tier')
        .eq('user_id', userId)
        .maybeSingle()
      if (planErr) throw planErr
      setTier((planRow?.tier as PlanTier) || 'free')

      // usage
      const { data: usageRow, error: usageErr } = await supabase
        .from('user_usage_monthly')
        .select('ai_messages_used, lit_searches_used, analyses_used')
        .eq('user_id', userId)
        .eq('period', pKey)
        .maybeSingle()
      if (usageErr) throw usageErr

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

  useEffect(() => { refresh() }, [userId])
  return { tier, limits, used, loading, error, remaining, exceeded, refresh, periodLabel: 'this month' }
}

/** ---------------- Page ---------------- */
export default function PricingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string>('Researcher')
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signin'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      setFullName(profile?.full_name || 'Researcher')
    })()
  }, [router])

  const { tier, limits, used, loading, error, remaining, periodLabel, refresh } = useUsage(userId)

  const upgradeTo = async (next: PlanTier) => {
    if (!userId) return
    setUpdating(true)
    try {
      await supabase
        .from('user_plans')
        .upsert({ user_id: userId, tier: next }, { onConflict: 'user_id' })
      await refresh()
    } catch (e) {
      console.error('Plan update failed:', e)
    } finally {
      setUpdating(false)
    }
  }

  const Meter = ({ icon: Icon, label, u, t }: { icon: any; label: string; u: number; t: number }) => {
    const pct = Math.min(100, Math.round((u / Math.max(1,t)) * 100))
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Icon className="w-3.5 h-3.5" /> {label}
          </span>
          <span>{u}/{t}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  const isPro = tier === 'pro'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-2">
            <FiArrowLeft /> Dashboard
          </Link>
          <div className="ml-auto inline-flex items-center gap-2 text-sm">
            <FiShield className="w-4 h-4" />
            <span className="px-2 py-1 rounded border bg-slate-50">{tier.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Greeting + Usage */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Hi {fullName.split(' ')[0] || 'there'} — choose what fits your research</h1>
              <p className="text-slate-600 text-sm">Fair monthly quotas ({periodLabel}). Server enforces limits.</p>
            </div>
            <Link href="/billing" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50">
              <FiZap /> Billing & Invoices
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Meter icon={FiMessageSquare} label="AI messages"  u={used.ai_messages}  t={limits.ai_messages} />
            <Meter icon={FiSearch}         label="Literature searches" u={used.lit_searches} t={limits.lit_searches} />
            <Meter icon={FiBarChart2}      label="Analyses" u={used.analyses} t={limits.analyses} />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        {/* Plans */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FREE */}
          <PlanCard
            title="Free"
            badge="Start collaborating"
            price="$0"
            period="/mo"
            features={[
              `${PLAN_LIMITS.free.ai_messages} AI messages / mo`,
              `${PLAN_LIMITS.free.lit_searches} literature searches / mo`,
              `${PLAN_LIMITS.free.analyses} analyses / mo`,
              `${niceCount(PLAN_RULES.free.colabs_create_max)} colabs you can create`,
              `${niceCount(PLAN_RULES.free.colabs_contribute_max)} colabs you can contribute in`,
              `Create Challenges: ${PLAN_RULES.free.challenges_create}`,
              'Public & private colabs (owner controls visibility)',
              'Community support',
            ]}
            ctas={[
              tier === 'free'
                ? { label: 'Your current plan', onClick: undefined, kind: 'ghost' as const }
                : { label: updating ? 'Switching…' : 'Switch to Free', onClick: () => upgradeTo('free'), kind: 'secondary' as const }
            ]}
            highlight={tier === 'free'}
          />

          {/* PRO */}
          <PlanCard
            title="Pro"
            badge="For active labs & power users"
            price="$12"
            period="/mo"
            features={[
              `${PLAN_LIMITS.pro.ai_messages} AI messages / mo`,
              `${PLAN_LIMITS.pro.lit_searches} literature searches / mo`,
              `${PLAN_LIMITS.pro.analyses} analyses / mo`,
              `${niceCount(PLAN_RULES.pro.colabs_create_max)} colabs you can create`,
              `${niceCount(PLAN_RULES.pro.colabs_contribute_max)} colabs you can contribute in`,
              `Create Challenges: ${PLAN_RULES.pro.challenges_create}`,
              'Priority models & faster lanes',
              'Email support',
            ]}
            ctas={[
              tier === 'pro'
                ? { label: 'Your current plan', onClick: undefined, kind: 'ghost' as const }
                : { label: updating ? 'Upgrading…' : 'Upgrade to Pro', onClick: () => upgradeTo('pro'), kind: 'primary' as const }
            ]}
            highlight={tier === 'pro'}
          />
        </section>

        {/* How challenges work */}
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><FiTarget /> Challenges — how it works</h2>
          <ul className="text-sm text-slate-700 space-y-2">
            <li className="flex items-start gap-2"><FiCheck className="mt-0.5 text-green-600" /> Individuals or institutions can create challenges from <Link href="/challenges/create" className="text-blue-700 underline">/challenges/create</Link>.</li>
            <li className="flex items-start gap-2"><FiCheck className="mt-0.5 text-green-600" /> <strong>Free:</strong> 1 active challenge at a time. Archive/close it to start another.</li>
            <li className="flex items-start gap-2"><FiCheck className="mt-0.5 text-green-600" /> <strong>Pro:</strong> Unlimited active challenges.</li>
            <li className="flex items-start gap-2"><FiInfo className="mt-0.5 text-slate-500" /> We also enforce reasonable anti-spam & moderation on the server.</li>
          </ul>
          <div className="pt-2">
            <Link href="/challenges/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black">
              <FiTarget /> Create a Challenge
            </Link>
          </div>
        </section>

        {/* Colab rules summary */}
        <section className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><FiUsers /> Colab limits by plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border bg-slate-50">
              <h3 className="font-semibold mb-2">Free</h3>
              <ul className="space-y-1 text-slate-700">
                <li>• Create up to <strong>{PLAN_RULES.free.colabs_create_max}</strong> colabs</li>
                <li>• Contribute in up to <strong>{PLAN_RULES.free.colabs_contribute_max}</strong> colabs</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-indigo-50 border-indigo-200">
              <h3 className="font-semibold mb-2">Pro</h3>
              <ul className="space-y-1 text-slate-800">
                <li>• Create: <strong>{niceCount(PLAN_RULES.pro.colabs_create_max)}</strong></li>
                <li>• Contribute in: <strong>{niceCount(PLAN_RULES.pro.colabs_contribute_max)}</strong></li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Note: Contribution includes membership and peer-review participation. We consider anyone who posts in Peer Review a contributor.
          </p>
        </section>

        {/* Tiny footer note */}
        <p className="text-xs text-slate-500">
          Client shows limits for clarity; the API/database enforces them authoritatively.
        </p>
      </main>
    </div>
  )
}

/** ---------------- Plan Card ---------------- */
function PlanCard({
  title, badge, price, period, features, ctas, highlight
}: {
  title: string
  badge?: string
  price: string
  period?: string
  features: string[]
  ctas: { label: string, onClick?: ()=>void, kind: 'primary'|'secondary'|'ghost' }[]
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-white p-6 relative ${highlight ? 'ring-2 ring-indigo-500 border-indigo-200' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-6 text-xs px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800">
          {badge}
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="text-slate-500">{period}</span>}
        </div>
      </div>
      <ul className="space-y-2 text-sm text-slate-700 mb-5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <FiCheck className="mt-0.5 text-green-600" /> <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {ctas.map((c, i) => (
          <button
            key={i}
            disabled={!c.onClick}
            onClick={c.onClick}
            className={
              c.kind === 'primary'
                ? 'px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                : c.kind === 'secondary'
                ? 'px-4 py-2 rounded-lg border hover:bg-slate-50 disabled:opacity-60'
                : 'px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-default'
            }
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
