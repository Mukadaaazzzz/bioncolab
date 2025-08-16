'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FiPlus, FiHome, FiSettings, FiLogOut, FiMenu, FiX, FiTarget, FiUsers, FiEdit, FiTrash2, FiMessageSquare } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/ui/header'
import ColabCard from '@/components/dashboard/ColabCard'
import ChallengeCard from '@/components/dashboard/ChallengeCard'
import CreateColabModal from '@/components/dashboard/CreateColabModal'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [userColabs, setUserColabs] = useState<any[]>([])
  const [openColabs, setOpenColabs] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingColab, setEditingColab] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingColab, setDeletingColab] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // open colabs contributor (member) counts + membership flags
  const [openColabMemberCounts, setOpenColabMemberCounts] = useState<Record<string, number>>({})
  const [joinedIds, setJoinedIds] = useState<Record<string, boolean>>({})
  const [joiningIds, setJoiningIds] = useState<Record<string, boolean>>({})

  // NEW: actual contributions (peer-review notes) per colab
  const [openColabContributionCounts, setOpenColabContributionCounts] = useState<Record<string, number>>({})
  const [userColabContributionCounts, setUserColabContributionCounts] = useState<Record<string, number>>({})

  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Your colabs (membership accepted)
      const { data: colabData } = await supabase
        .from('colab_members')
        .select('colabs(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
      const myColabs = colabData?.map((item: any) => item.colabs) || []
      setUserColabs(myColabs)

      // Public colabs (with owner mini-profile)
      let openList: any[] = []
      try {
        const { data: openColabData, error: joinError } = await supabase
          .from('colabs')
          .select(`
            *,
            profiles!colabs_owner_id_fkey(full_name, username, avatar_url)
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(6)

        openList = openColabData || []

        if (joinError) {
          // fallback: fetch colabs then owners
          const { data: colabsOnly } = await supabase
            .from('colabs')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(6)

          if (colabsOnly?.length) {
            const ownerIds = Array.from(new Set(colabsOnly.map((c: any) => c.owner_id)))
            const { data: ownersData } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .in('id', ownerIds)

            openList = (colabsOnly || []).map((colab: any) => ({
              ...colab,
              profiles: ownersData?.find((o: any) => o.id === colab.owner_id) || null
            }))
          } else {
            openList = []
          }
        }
      } catch (e) {
        console.error('Error in open colabs fetch:', e)
        openList = []
      }
      setOpenColabs(openList)

      // ---- Counts + membership flags for open colabs ----
      const openIds = openList.map((c: any) => c.id)

      if (openIds.length) {
        // members per open colab
        const memberCounts: Record<string, number> = {}
        await Promise.all(
          openIds.map(async (id: string) => {
            const { count } = await supabase
              .from('colab_members')
              .select('id', { count: 'exact', head: true })
              .eq('colab_id', id)
              .eq('status', 'accepted')
            memberCounts[id] = count || 0
          })
        )
        setOpenColabMemberCounts(memberCounts)

        // contributions per open colab (count research_notes rows)
        const contribCounts: Record<string, number> = {}
        await Promise.all(
          openIds.map(async (id: string) => {
            const { count } = await supabase
              .from('research_notes')
              .select('id', { count: 'exact', head: true })
              .eq('colab_id', id)
            contribCounts[id] = count || 0
          })
        )
        setOpenColabContributionCounts(contribCounts)

        // did current user join?
        const { data: myMemberships } = await supabase
          .from('colab_members')
          .select('colab_id')
          .in('colab_id', openIds)
          .eq('user_id', user.id)
          .eq('status', 'accepted')

        const joined: Record<string, boolean> = {}
        myMemberships?.forEach((m: any) => { joined[m.colab_id] = true })
        setJoinedIds(joined)
      } else {
        setOpenColabMemberCounts({})
        setOpenColabContributionCounts({})
        setJoinedIds({})
      }
      // ----------------------------------------------------

      // contributions for "Your Colabs"
      if (myColabs.length) {
        const myIds = myColabs.map((c: any) => c.id)
        const myContribCounts: Record<string, number> = {}
        await Promise.all(
          myIds.map(async (id: string) => {
            const { count } = await supabase
              .from('research_notes')
              .select('id', { count: 'exact', head: true })
              .eq('colab_id', id)
            myContribCounts[id] = count || 0
          })
        )
        setUserColabContributionCounts(myContribCounts)
      } else {
        setUserColabContributionCounts({})
      }

      // Challenges
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)
      setChallenges(challengeData || [])

      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCreateColab = async (name: string, description: string, readme: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    const { data, error } = await supabase
      .from('colabs')
      .insert([{
        name,
        slug,
        description,
        readme,
        owner_id: user.id,
        is_public: true // sensible default for visibility on dashboard; tweak if needed
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating colab:', error)
      return
    }

    // Add creator as owner
    await supabase
      .from('colab_members')
      .insert([{
        colab_id: data.id,
        user_id: user.id,
        role: 'owner',
        status: 'accepted'
      }])

    setUserColabs([data, ...userColabs])
    setShowCreateModal(false)
  }

  const handleEditColab = async (name: string, description: string, readme: string) => {
    if (!editingColab) return

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    const { data, error } = await supabase
      .from('colabs')
      .update({
        name,
        slug,
        description,
        readme
      })
      .eq('id', editingColab.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating colab:', error)
      return
    }

    setUserColabs(userColabs.map(colab => 
      colab.id === editingColab.id ? data : colab
    ))
    setShowEditModal(false)
    setEditingColab(null)
  }

  const handleDeleteColab = async () => {
    if (!deletingColab) return

    const { error: membersError } = await supabase
      .from('colab_members')
      .delete()
      .eq('colab_id', deletingColab.id)

    if (membersError) {
      console.error('Error deleting colab members:', membersError)
      return
    }

    const { error } = await supabase
      .from('colabs')
      .delete()
      .eq('id', deletingColab.id)

    if (error) {
      console.error('Error deleting colab:', error)
      return
    }

    setUserColabs(userColabs.filter(colab => colab.id !== deletingColab.id))
    setShowDeleteConfirm(false)
    setDeletingColab(null)
  }

  const openEditModal = (colab: any) => {
    setEditingColab(colab)
    setShowEditModal(true)
  }

  const openDeleteConfirm = (colab: any) => {
    setDeletingColab(colab)
    setShowDeleteConfirm(true)
  }

  // join a public colab
  const handleJoinColab = async (colabId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signin'); return }

    setJoiningIds(prev => ({ ...prev, [colabId]: true }))
    try {
      await supabase
        .from('colab_members')
        .upsert(
          { colab_id: colabId, user_id: user.id, role: 'member', status: 'accepted' },
          { onConflict: 'colab_id,user_id' }
        )
      setJoinedIds(prev => ({ ...prev, [colabId]: true }))
      setOpenColabMemberCounts(prev => ({ ...prev, [colabId]: (prev[colabId] || 0) + 1 }))
    } catch (e) {
      console.error('Join failed:', e)
    } finally {
      setJoiningIds(prev => ({ ...prev, [colabId]: false }))
    }
  }

  // Debug (optional)
  const debugOpenColabs = () => {
    console.log('Open Colabs Data:', openColabs)
    console.log('Contributors map:', openColabMemberCounts)
    console.log('Contributions map:', openColabContributionCounts)
    console.log('Joined map:', joinedIds)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all"
      >
        {sidebarOpen ? <FiX className="w-5 h-5 text-gray-700" /> : <FiMenu className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 md:w-56 
        bg-white shadow-lg md:shadow-none border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-center md:justify-start">
            <Link href="/" className="flex items-center group">
              <Image 
                src="/biocol.png" 
                width={40} 
                height={40} 
                alt="Bioncolab Logo"
                className="w-10 h-10 md:w-8 md:h-8"
              />
              <span className="ml-2 text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors hidden md:block">
                Bioncolab
              </span>
            </Link>
          </div>
        </div>

        {/* Profile Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-medium">{(profile?.full_name || 'U')[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">@{profile?.username || 'username'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors shadow-sm text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" />
            Create Colab
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          <Link
            href="#"
            className="flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <FiHome className="mr-2 w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/profile"
            className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <FiSettings className="mr-2 w-4 h-4" />
            Settings
          </Link>
        </nav>
        
        {/* Logout Button */}
        <div className="p-3 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 py-2 px-3 rounded-lg text-sm"
          >
            <FiLogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Researcher'}!
              </h1>
              <p className="text-gray-600">Ready to tackle some challenges and collaborate?</p>
            </div>
            
            {/* Featured Challenges */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FiTarget className="text-red-600 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Featured Challenges</h2>
                    <p className="text-gray-500 text-sm">Join the mission to solve critical healthcare challenges</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/challenges"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors flex items-center"
                  >
                    View all <FiPlus className="ml-1 w-3 h-3" />
                  </Link>
                  <Link
                    href="/challenges/create"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    Create
                  </Link>
                </div>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : challenges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {challenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <FiTarget className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No challenges found</h3>
                  <p className="text-gray-500 mb-4 text-sm">Be the first to create a challenge for the community</p>
                  <Link
                    href="/challenges/create"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm inline-flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    Create challenge
                  </Link>
                </div>
              )}
            </div>
            
            {/* Two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Colabs */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiUsers className="text-blue-600 w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Your Colabs</h2>
                  </div>
                  {userColabs.length > 0 && (
                    <Link href="/colabs" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      View all
                    </Link>
                  )}
                </div>
                
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : userColabs.length > 0 ? (
                  <div className="space-y-3">
                    {userColabs.slice(0, 4).map(colab => {
                      const contributions = userColabContributionCounts[colab.id] ?? 0
                      return (
                        <div key={colab.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-md font-semibold text-blue-600 hover:text-blue-700 mb-1">
                                <Link href={`/colab/${colab.slug}`}>{colab.name}</Link>
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {colab.description || 'No description available'}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {colab.is_public ? 'Public' : 'Private'}
                                </span>
                                <span className="text-gray-500">
                                  Created {new Date(colab.created_at).toLocaleDateString()}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                  <FiMessageSquare className="w-3.5 h-3.5" />
                                  {contributions} contributions
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 ml-3">
                              <button
                                onClick={() => openEditModal(colab)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit colab"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(colab)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete colab"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No colabs yet</h3>
                    <p className="text-gray-500 mb-4 text-sm">Start collaborating with researchers worldwide</p>
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                    >
                      Create colab
                    </button>
                  </div>
                )}
              </div>
              
              {/* Open Colabs (with real contributions + members + joined) */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiUsers className="text-green-600 w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Open Colabs</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/colabs/explore" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Explore all
                    </Link>
                    <button 
                      onClick={debugOpenColabs}
                      className="text-xs text-gray-400 hover:text-gray-600"
                      title="Debug (remove this)"
                    >
                      🐛
                    </button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : openColabs && openColabs.length > 0 ? (
                  <div className="space-y-3">
                    {openColabs.slice(0, 3).map(colab => {
                      const memberCount = openColabMemberCounts[colab.id] ?? 0
                      const contributions = openColabContributionCounts[colab.id] ?? 0
                      const alreadyMember = !!joinedIds[colab.id]
                      const joining = !!joiningIds[colab.id]

                      return (
                        <div key={colab.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                              {colab.profiles?.avatar_url ? (
                                <img src={colab.profiles.avatar_url} alt="Owner" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-white font-medium">
                                  {(colab.profiles?.full_name || colab.profiles?.username || 'U')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {colab.profiles?.full_name || colab.profiles?.username || 'Anonymous'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(colab.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <h3 className="text-md font-semibold text-blue-600 hover:text-blue-700 mb-1">
                            <Link href={`/colab/${colab.slug}`}>{colab.name}</Link>
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {colab.description || 'No description available'}
                          </p>
                          
                          {/* badges: REMOVED "Open Source"; show contributions + members */}
                          <div className="flex items-center gap-2 text-xs mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              <FiMessageSquare className="w-3.5 h-3.5" />
                              {contributions} contributions
                            </span>
                           
                          </div>

                           <Link
                                  href={`/colab/${colab.slug}`}
                                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                  View
                                </Link>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-blue-500 mx-auto mb-4 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No open colabs available</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Be the first to create a public collaboration
                    </p>
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                    >
                      Create public colab
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Colab Modal */}
      {showCreateModal && (
        <CreateColabModal 
          onCloseAction={() => setShowCreateModal(false)}
          onCreateAction={handleCreateColab}
        />
      )}

      {/* Edit Colab Modal */}
      {showEditModal && editingColab && (
        <CreateColabModal 
          onCloseAction={() => {
            setShowEditModal(false)
            setEditingColab(null)
          }}
          onCreateAction={handleEditColab}
          initialData={{
            name: editingColab.name,
            description: editingColab.description,
            readme: editingColab.readme
          }}
          isEditing={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingColab && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FiTrash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Colab</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>"{deletingColab.name}"</strong>? 
              This will permanently remove the colab and all its data.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingColab(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteColab}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Colab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
