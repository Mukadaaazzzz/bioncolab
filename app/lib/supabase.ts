import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase URL and Anon Key must be provided in environment variables'
  )
}

// For client components - use this in your React components
export const supabase = createClientComponentClient()

// Legacy client for backwards compatibility
export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Helper function to get user profile
export const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (error) {
      console.error('Error fetching profile:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching profile:', err)
    return { data: null, error: err }
  }
}

// Helper function to upsert profile with better error handling
export const upsertProfile = async (profileData: any) => {
  try {
    // Ensure required fields are present
    if (!profileData.id) {
      throw new Error('Profile ID is required')
    }
    
    if (!profileData.username) {
      throw new Error('Username is required')
    }

    // Clean the data before sending
    const cleanData = {
      ...profileData,
      // Ensure arrays are properly formatted
      interests: Array.isArray(profileData.interests) ? profileData.interests : [],
      // Ensure strings are properly trimmed or set to empty
      full_name: profileData.full_name?.trim() || '',
      bio: profileData.bio?.trim() || '',
      institution: profileData.institution?.trim() || '',
      location: profileData.location?.trim() || '',
      twitter_url: profileData.twitter_url?.trim() || '',
      linkedin_url: profileData.linkedin_url?.trim() || '',
      github_url: profileData.github_url?.trim() || '',
      website_url: profileData.website_url?.trim() || '',
      // Ensure role is valid or empty
      role: profileData.role || '',
      gender: profileData.gender || '',
      updated_at: new Date().toISOString()
    }

    console.log('Upserting profile data:', cleanData)

    const { data, error } = await supabase
      .from('profiles')
      .upsert(cleanData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase upsert error:', error)
      return { data: null, error }
    }

    console.log('Profile upserted successfully:', data)
    return { data, error: null }
  } catch (err: any) {
    console.error('Unexpected error upserting profile:', err)
    return { data: null, error: { message: err.message || 'Unknown error occurred' } }
  }
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

// Helper to check if user exists in profiles table
export const checkUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    return { exists: !!data && !error, error }
  } catch (err) {
    return { exists: false, error: err }
  }
}

export { createClient }