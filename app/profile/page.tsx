'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FiEdit, FiSave, FiGlobe, FiTwitter, FiLinkedin, FiGithub, FiUser, FiBriefcase, FiMapPin, FiX } from 'react-icons/fi'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  bio: string
  role: string
  institution: string
  location: string
  gender: string
  twitter_url: string
  linkedin_url: string
  github_url: string
  website_url: string
  interests: string[]
  created_at?: string
  updated_at?: string
}

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'professor', label: 'Professor' },
  { value: 'industry', label: 'Industry Professional' }
]

const SUGGESTED_INTERESTS = [
  'Genomics', 'Proteomics', 'Bioinformatics', 'CRISPR',
  'Neuroscience', 'Cancer Research', 'Immunology',
  'Synthetic Biology', 'Structural Biology', 'Drug Discovery'
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newInterest, setNewInterest] = useState('')
  const [isNewProfile, setIsNewProfile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          
          // If profile doesn't exist, create a default one
          const defaultProfile: Profile = {
            id: user.id,
            username: user.email?.split('@')[0] || `user_${Date.now()}`,
            full_name: '',
            avatar_url: null,
            bio: '',
            role: '',
            institution: '',
            location: '',
            gender: '',
            twitter_url: '',
            linkedin_url: '',
            github_url: '',
            website_url: '',
            interests: []
          }
          
          setProfile(defaultProfile)
          setIsNewProfile(true)
          setEditing(true) // Start in edit mode for new profiles
        } else {
          setProfile({
            ...profileData,
            interests: profileData.interests || []
          } as Profile)
          setIsNewProfile(false)
        }
      } catch (err) {
        console.error('Error in profile fetch:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleSave = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    
    try {
      // Validate required fields
      if (!profile.username.trim()) {
        throw new Error('Username is required')
      }

      // Clean the profile data before saving
      const profileToSave = {
        id: profile.id,
        username: profile.username.trim(),
        full_name: profile.full_name?.trim() || '',
        avatar_url: profile.avatar_url,
        bio: profile.bio?.trim() || '',
        role: profile.role || '',
        institution: profile.institution?.trim() || '',
        location: profile.location?.trim() || '',
        gender: profile.gender || '',
        twitter_url: profile.twitter_url?.trim() || '',
        linkedin_url: profile.linkedin_url?.trim() || '',
        github_url: profile.github_url?.trim() || '',
        website_url: profile.website_url?.trim() || '',
        interests: profile.interests || [],
        updated_at: new Date().toISOString()
      }

      

      console.log('Saving profile:', profileToSave)

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileToSave, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('Detailed save error:', error)
        throw new Error(error.message || 'Failed to save profile')
      }

      console.log('Profile saved successfully:', data)
      setEditing(false)
      setIsNewProfile(false)
      
      // Show success message
      setError(null)
    } catch (err: any) {
      console.error('Profile save error:', err)
      setError(err.message || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addInterest = (interest: string) => {
    if (!profile || !interest.trim()) return
    
    const interestToAdd = interest.trim()
    if (!profile.interests.includes(interestToAdd)) {
      setProfile({
        ...profile,
        interests: [...profile.interests, interestToAdd]
      })
    }
    setNewInterest('')
  }

  const removeInterest = (interestToRemove: string) => {
    if (!profile) return
    
    setProfile({
      ...profile,
      interests: profile.interests.filter(i => i !== interestToRemove)
    })
  }

  const handleCancel = () => {
    if (isNewProfile) {
      // For new profiles, redirect back or show a message
      router.push('/')
    } else {
      setEditing(false)
      // Reset any unsaved changes by refetching
      window.location.reload()
    }
  }

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p>Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-red-500">Failed to load profile. Please try again.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      {isNewProfile && editing && (
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded">
          <p>Welcome! Please complete your profile to get started.</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="text-gray-400 text-3xl" />
                )}
              </div>
              {editing && (
                <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-sm border border-gray-200">
                  <FiEdit className="text-blue-600" />
                </button>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {editing ? (
                      <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        className="border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      profile.full_name || 'Anonymous Researcher'
                    )}
                  </h1>
                  
                  <p className="text-gray-600 mt-1">
                    {editing ? (
                      <select
                        value={profile.role}
                        onChange={(e) => setProfile({...profile, role: e.target.value})}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">Select your role</option>
                        {ROLE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_OPTIONS.find(r => r.value === profile.role)?.label || 'No role specified'
                    )}
                  </p>

                  {editing && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600 mb-1">Username *</label>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                        className="border rounded px-3 py-1 text-sm"
                        placeholder="Enter username"
                        required
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {editing && (
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={editing ? handleSave : () => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    disabled={loading}
                  >
                    {editing ? <FiSave /> : <FiEdit />}
                    {editing ? (loading ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
              {editing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-[120px]"
                  placeholder="Tell us about your research interests..."
                />
              ) : (
                <p className="text-gray-700">
                  {profile.bio || 'No bio provided'}
                </p>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiBriefcase className="text-gray-400" />
                  {editing ? (
                    <input
                      type="text"
                      value={profile.institution}
                      onChange={(e) => setProfile({...profile, institution: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="Institution"
                    />
                  ) : (
                    <span>{profile.institution || 'Not specified'}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <FiMapPin className="text-gray-400" />
                  {editing ? (
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => setProfile({...profile, location: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="Location"
                    />
                  ) : (
                    <span>{profile.location || 'Not specified'}</span>
                  )}
                </div>
                
                {editing && (
                  <div className="flex items-center gap-3">
                    <FiUser className="text-gray-400" />
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({...profile, gender: e.target.value})}
                      className="flex-1 border rounded px-2 py-1"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Research Interests</h2>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.interests.map(interest => (
                      <div key={interest} className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                        {interest}
                        <button 
                          onClick={() => removeInterest(interest)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addInterest(newInterest)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="Add new interest"
                    />
                    <button
                      onClick={() => addInterest(newInterest)}
                      className="px-3 py-2 bg-blue-600 text-white rounded"
                      disabled={!newInterest.trim()}
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Suggested interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_INTERESTS.filter(i => !profile.interests.includes(i)).map(interest => (
                        <button
                          key={interest}
                          onClick={() => addInterest(interest)}
                          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.length ? (
                    profile.interests.map(interest => (
                      <span key={interest} className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm">
                        {interest}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No interests selected</p>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Social Links</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiTwitter className="text-gray-400" />
                  {editing ? (
                    <input
                      type="url"
                      value={profile.twitter_url}
                      onChange={(e) => setProfile({...profile, twitter_url: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="Twitter URL"
                    />
                  ) : (
                    profile.twitter_url ? (
                      <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.twitter_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <FiLinkedin className="text-gray-400" />
                  {editing ? (
                    <input
                      type="url"
                      value={profile.linkedin_url}
                      onChange={(e) => setProfile({...profile, linkedin_url: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="LinkedIn URL"
                    />
                  ) : (
                    profile.linkedin_url ? (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.linkedin_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <FiGithub className="text-gray-400" />
                  {editing ? (
                    <input
                      type="url"
                      value={profile.github_url}
                      onChange={(e) => setProfile({...profile, github_url: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="GitHub URL"
                    />
                  ) : (
                    profile.github_url ? (
                      <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.github_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <FiGlobe className="text-gray-400" />
                  {editing ? (
                    <input
                      type="url"
                      value={profile.website_url}
                      onChange={(e) => setProfile({...profile, website_url: e.target.value})}
                      className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="Personal website"
                    />
                  ) : (
                    profile.website_url ? (
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}