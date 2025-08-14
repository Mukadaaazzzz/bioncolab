'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { FiArrowLeft, FiCalendar, FiDollarSign, FiTag, FiUsers, FiAlertTriangle } from 'react-icons/fi'
import Link from 'next/link'

interface Challenge {
  id: string
  title: string
  description: string
  disease_focus: string
  priority_level: string
  expected_outcome: string
  resources_needed: string | null
  deadline: string | null
  reward_amount: number | null
  tags: string[]
  created_at: string
  creator: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    role: string
    institution: string | null
  }
}

export default function ChallengeDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: supabaseError } = await supabase
          .from('challenges')
          .select(`
            *,
            creator:profiles(id, full_name, username, avatar_url, role, institution)
          `)
          .eq('id', id)
          .single()

        if (supabaseError) throw supabaseError
        if (!data) throw new Error('Challenge not found')

        setChallenge(data as Challenge)
      } catch (err) {
        console.error('Error fetching challenge:', err)
        setError(err instanceof Error ? err.message : 'Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }

    fetchChallenge()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center gap-2 text-red-700">
              <FiAlertTriangle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Challenges
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          <p>Challenge not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/challenges"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Challenges
          </Link>
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{challenge.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              challenge.priority_level === 'low' ? 'bg-green-100 text-green-800' :
              challenge.priority_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              challenge.priority_level === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {challenge.priority_level === 'low' ? 'Low Priority' :
               challenge.priority_level === 'medium' ? 'Medium Priority' :
               challenge.priority_level === 'high' ? 'High Priority' : 'Critical Priority'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {challenge.creator.avatar_url ? (
                  <img 
                    src={challenge.creator.avatar_url} 
                    alt={challenge.creator.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">
                    {challenge.creator.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span>{challenge.creator.full_name}</span>
            </div>
            <span>•</span>
            <span>{new Date(challenge.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Challenge Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Challenge Description</h2>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{challenge.description}</p>
              </div>
            </div>

            {/* Expected Outcome */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Expected Outcome</h2>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{challenge.expected_outcome}</p>
              </div>
            </div>

            {/* Resources Needed */}
            {challenge.resources_needed && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Resources Needed</h2>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-line">{challenge.resources_needed}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Meta Information */}
          <div className="space-y-6">
            {/* Disease Focus */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Disease Focus</h3>
              <p className="text-gray-700">{challenge.disease_focus}</p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
              <div className="flex items-center gap-2 text-gray-700">
                <FiCalendar className="text-gray-400" />
                <span>
                  {challenge.deadline 
                    ? `Target completion by ${new Date(challenge.deadline).toLocaleDateString()}`
                    : 'No deadline set'}
                </span>
              </div>
            </div>

            {/* Reward */}
            {challenge.reward_amount && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reward</h3>
                <div className="flex items-center gap-2 text-gray-700">
                  <FiDollarSign className="text-gray-400" />
                  <span>${challenge.reward_amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {challenge.tags && challenge.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center gap-1"
                    >
                      <FiTag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Creator Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Challenge Creator</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {challenge.creator.avatar_url ? (
                    <img 
                      src={challenge.creator.avatar_url} 
                      alt={challenge.creator.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-lg">
                      {challenge.creator.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{challenge.creator.full_name}</p>
                  <p className="text-sm text-gray-600">{challenge.creator.role}</p>
                  {challenge.creator.institution && (
                    <p className="text-sm text-gray-500">{challenge.creator.institution}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                Join Challenge
              </button>
              <button className="w-full py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                Fork Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}