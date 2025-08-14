'use client'

import { useState } from 'react'
import { FiSend, FiMessageSquare, FiZap } from 'react-icons/fi'
import { supabase } from "../../app/lib/supabase"

interface AIAssistantProps {
  promptCount: number
}

export default function AIAssistant({ promptCount }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
 

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (promptCount >= 5) {
      setError('You have reached your monthly limit of 5 AI prompts. Upgrade to continue.')
      return
    }

    if (!prompt.trim()) return

    try {
      setLoading(true)
      setError('')

      // Call Gemini API via a Next.js API route
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      setResponse(data.response)

      // Record the prompt in Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('ai_prompts').insert([
          {
            user_id: user.id,
            prompt,
            response: data.response,
            model: 'gemini-pro'
          }
        ])
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Failed to get response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <FiMessageSquare className="text-blue-600 text-xl" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Ask Shawn (AI Assistant)</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Get help with literature review, experimental design, or data analysis. 
        {promptCount < 5 ? (
          <span className="text-blue-600"> {5 - promptCount} prompts remaining this month.</span>
        ) : (
          <span className="text-red-600"> You've used all your free prompts.</span>
        )}
      </p>
      
      {response && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ask Shawn about your research..."
          disabled={loading || promptCount >= 5}
        />
        <button
          type="submit"
          disabled={loading || promptCount >= 5 || !prompt.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Thinking...' : <FiSend />}
        </button>
      </form>
      
      <div className="mt-3 text-xs text-gray-500 flex items-center">
        <FiZap className="mr-1" />
        Powered by Gemini AI
      </div>
    </div>
  )
}