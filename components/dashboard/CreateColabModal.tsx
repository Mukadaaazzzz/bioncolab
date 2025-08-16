'use client'

import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'

interface CreateColabModalProps {
  onCloseAction: () => void
  onCreateAction: (
    name: string,
    description: string,
    readme: string,
    isPublic: boolean,
    allowJoinRequests: boolean
  ) => Promise<void>
  initialData?: {
    name: string
    description: string
    readme: string
    is_public?: boolean
    allow_join_requests?: boolean
  }
  isEditing?: boolean
}

export default function CreateColabModal({
  onCloseAction,
  onCreateAction,
  initialData,
  isEditing = false
}: CreateColabModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [readme, setReadme] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [allowJoinRequests, setAllowJoinRequests] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setReadme(initialData.readme || '')
      setIsPublic(initialData.is_public ?? true)
      setAllowJoinRequests(initialData.allow_join_requests ?? true)
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await onCreateAction(
        name.trim(),
        description.trim(),
        readme,
        isPublic,
        allowJoinRequests
      )
      // parent decides when to close after successful op
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Colab' : 'Create New Colab'}
            </h2>
            <button onClick={onCloseAction} className="text-gray-400 hover:text-gray-500">
              <FiX className="text-xl" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Research Project"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your research"
              />
            </div>

            {/* README */}
            <div>
              <label htmlFor="readme" className="block text-sm font-medium text-gray-700 mb-1">
                README
              </label>
              <textarea
                id="readme"
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                placeholder="Detailed information about your research..."
              />
            </div>

            {/* Visibility */}
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Visibility</p>
                  <p className="text-xs text-gray-500">
                    {isPublic
                      ? 'Anyone can view (and request to join if allowed).'
                      : 'Only invited members can view and contribute.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPublic((v) => !v)}
                    className="ml-1 inline-flex items-center px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Toggle
                  </button>
                </div>
              </div>

              {/* Allow join requests (only for public colabs) */}
              {isPublic && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={allowJoinRequests}
                    onChange={(e) => setAllowJoinRequests(e.target.checked)}
                  />
                  Allow join requests
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCloseAction}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                  ? 'Update Colab'
                  : 'Create Colab'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
