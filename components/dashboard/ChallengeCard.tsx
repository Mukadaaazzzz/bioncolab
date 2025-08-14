import Link from 'next/link'
import { FiTarget, FiClock, FiUsers, FiTrendingUp } from 'react-icons/fi'
import { useSessionn } from '../../app/lib/useSession'


const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
}

const PRIORITY_ICONS = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴'
}

export default function ChallengeCard({ challenge }: { challenge: any }) {
  const priorityColor = PRIORITY_COLORS[challenge.priority_level as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200'
  const priorityIcon = PRIORITY_ICONS[challenge.priority_level as keyof typeof PRIORITY_ICONS] || '⚪'

  const session = useSessionn()
  
  
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer h-full overflow-hidden">
        {/* Header with priority and urgency */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiTarget className="text-red-500 w-5 h-5" />
              <span className="text-sm font-medium text-gray-600">Challenge</span>
            </div>
            {challenge.priority_level && (
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${priorityColor} flex items-center gap-1`}>
                <span>{priorityIcon}</span>
                {challenge.priority_level.toUpperCase()}
              </span>
            )}
          </div>
          
          <h3 className="font-bold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {challenge.title}
          </h3>
          
          <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed">
            {challenge.description}
          </p>
        </div>

        {/* Content section */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700">Disease Focus:</span>
            </div>
            <span className="text-blue-700 font-medium">{challenge.disease_focus}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <FiUsers className="w-4 h-4" />
              <span>0 contributors</span>
            </div>
            <div className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              <span>{new Date(challenge.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <FiTrendingUp className="w-4 h-4" />
              <span>New</span>
            </div>
          </div>
        </div>

        {/* Bottom call-to-action gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </div>
    </Link>
  )
}