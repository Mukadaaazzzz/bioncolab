'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Session {
  user: {
    id: string
    email?: string
  } | null
}

export function useSessionn() {
  const [session, setSession] = useState<Session>({ user: null })

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSession({ user: user ? { id: user.id, email: user.email } : null })
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession({ user: session?.user ? { id: session.user.id, email: session.user.email } : null })
    })

    return () => subscription.unsubscribe()
  }, [])

  return session
}