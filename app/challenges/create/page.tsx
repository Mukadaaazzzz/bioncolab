'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { FiArrowLeft, FiTarget, FiAlertTriangle, FiSave, FiX } from 'react-icons/fi'
import Link from 'next/link'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority', color: 'text-green-600', icon: '🟢', description: 'Non-urgent research needs' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', icon: '🟡', description: 'Important but not critical' },
  { value: 'high', label: 'High Priority', color: 'text-orange-600', icon: '🟠', description: 'Urgent medical need' },
  { value: 'critical', label: 'Critical Priority', color: 'text-red-600', icon: '🔴', description: 'Life-threatening emergency' }
]

const DISEASE_CATEGORIES = [
  'Cancer Research',
  'Cardiovascular Disease',
  'Neurological Disorders',
  'Infectious Diseases',
  'Diabetes & Metabolic',
  'Mental Health',
  'Rare Diseases',
  'Pediatric Conditions',
  'Genetic Disorders',
  'Autoimmune Diseases',
  'Other'
]

interface ChallengeFormData {
  title: string
  description: string
  disease_focus: string
  priority_level: string
  expected_outcome: string
  resources_needed: string
  deadline: string
  reward_amount: string
  tags: string
}

export default function CreateChallengePage() {
  const [formData, setFormData] = useState<ChallengeFormData>({
    title: '',
    description: '',
    disease_focus: '',
    priority_level: 'medium',
    expected_outcome: '',
    resources_needed: '',
    deadline: '',
    reward_amount: '',
    tags: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.disease_focus.trim()) newErrors.disease_focus = 'Disease focus is required'
    if (!formData.expected_outcome.trim()) newErrors.expected_outcome = 'Expected outcome is required'
    
    if (formData.title.length > 100) newErrors.title = 'Title must be less than 100 characters'
    if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      // Prepare challenge data
      const challengeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        disease_focus: formData.disease_focus,
        priority_level: formData.priority_level,
        expected_outcome: formData.expected_outcome.trim(),
        resources_needed: formData.resources_needed.trim() || null,
        deadline: formData.deadline || null,
        reward_amount: formData.reward_amount ? parseFloat(formData.reward_amount) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        creator_id: user.id
      }

      // Insert challenge and get back the created record with creator info
      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert(challengeData)
        .select(`
          id,
          title,
          description,
          disease_focus,
          priority_level,
          created_at,
          creator:profiles(id, full_name, username, avatar_url, role, institution)
        `)
        .single()

      if (error) throw error

      // Redirect to challenge page
      router.push(`/challenges/${challenge.id}`)
    } catch (error) {
      console.error('Error creating challenge:', error)
      setErrors({ submit: 'Failed to create challenge. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 rounded-xl">
              <FiTarget className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Challenge</h1>
          </div>
          <p className="text-gray-600">Help the research community tackle critical healthcare problems</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="space-y-6">
              {/* Title Field */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter a clear, compelling title for your challenge"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  maxLength={100}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertTriangle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.title.length}/100 characters</p>
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                  Challenge Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Provide a detailed description of the challenge, including background, current problems, and why this research is important..."
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                    errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertTriangle className="w-4 h-4" />
                    {errors.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.description.length} characters (minimum 50)</p>
              </div>

              {/* Disease Focus and Priority Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Disease Focus */}
                <div>
                  <label htmlFor="disease_focus" className="block text-sm font-semibold text-gray-900 mb-2">
                    Disease Focus *
                  </label>
                  <select
                    id="disease_focus"
                    name="disease_focus"
                    value={formData.disease_focus}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.disease_focus ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select disease category</option>
                    {DISEASE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.disease_focus && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertTriangle className="w-4 h-4" />
                      {errors.disease_focus}
                    </p>
                  )}
                </div>

                {/* Priority Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${
                          formData.priority_level === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="priority_level"
                          value={option.value}
                          checked={formData.priority_level === option.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <span>{option.icon}</span>
                          <span className={`text-sm font-medium ${option.color}`}>
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Details</h2>
            
            <div className="space-y-6">
              {/* Expected Outcome */}
              <div>
                <label htmlFor="expected_outcome" className="block text-sm font-semibold text-gray-900 mb-2">
                  Expected Outcome *
                </label>
                <textarea
                  id="expected_outcome"
                  name="expected_outcome"
                  value={formData.expected_outcome}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="What specific results or deliverables do you expect from this challenge?"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                    errors.expected_outcome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.expected_outcome && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertTriangle className="w-4 h-4" />
                    {errors.expected_outcome}
                  </p>
                )}
              </div>

              {/* Resources Needed */}
              <div>
                <label htmlFor="resources_needed" className="block text-sm font-semibold text-gray-900 mb-2">
                  Resources Needed
                </label>
                <textarea
                  id="resources_needed"
                  name="resources_needed"
                  value={formData.resources_needed}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="What resources, data, or expertise would be helpful for solving this challenge?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {/* Deadline and Reward */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deadline */}
                <div>
                  <label htmlFor="deadline" className="block text-sm font-semibold text-gray-900 mb-2">
                    Target Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Reward Amount */}
                <div>
                  <label htmlFor="reward_amount" className="block text-sm font-semibold text-gray-900 mb-2">
                    Reward Amount (Optional)
                  </label>
                  <input
                    type="number"
                    id="reward_amount"
                    name="reward_amount"
                    value={formData.reward_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-500">Amount in USD for successful solution</p>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-semibold text-gray-900 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="machine learning, data analysis, clinical trials (comma-separated)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">Add relevant tags to help researchers find your challenge</p>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 flex items-center gap-2">
                  <FiAlertTriangle className="w-4 h-4" />
                  {errors.submit}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ready to Launch?</h3>
                <p className="text-gray-600">Your challenge will be visible to the entire research community</p>
              </div>
              
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      Create Challenge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}