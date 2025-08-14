import { FiBook, FiLock, FiUsers, FiGitBranch } from 'react-icons/fi'
import Link from 'next/link'
import { Lab } from '../../app/types/lab-types'

interface LabCardProps {
  lab: Lab
}

export default function LabCard({ lab }: LabCardProps) {
  return (
    <Link href={`/lab/${lab.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {!lab.is_public && <FiLock className="text-gray-500 mr-2" />}
            {lab.name}
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full ${lab.is_public ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
            {lab.is_public ? 'Public' : 'Private'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-2">{lab.description || 'No description provided'}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <FiUsers className="text-gray-400" />
            <span>12 collaborators</span>
          </div>
          <div className="flex items-center space-x-2">
            <FiGitBranch className="text-gray-400" />
            <span>5 forks</span>
          </div>
        </div>
      </div>
    </Link>
  )
}