'use client'

import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'

interface CreateColabModalProps {
  onCloseAction: () => void
  onCreateAction: (name: string, description: string, readme: string) => Promise<void>
  initialData?: {
    name: string
    description: string
    readme: string
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
  const [loading, setLoading] = useState(false)

  // Pre-fill form when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setReadme(initialData.readme || '')
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setLoading(true)
    try {
      await onCreateAction(name, description, readme)
      // Don't call onCloseAction here - let the parent handle it after successful operation
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your research"
              />
            </div>
            
            <div>
              <label htmlFor="readme" className="block text-sm font-medium text-gray-700 mb-1">README</label>
              <textarea
                id="readme"
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                placeholder="Detailed information about your research..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
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
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update Colab' : 'Create Colab')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}