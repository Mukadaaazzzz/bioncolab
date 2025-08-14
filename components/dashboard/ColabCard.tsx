import Link from 'next/link'
import { FiGitBranch, FiUsers } from 'react-icons/fi'

export default function ColabCard({ colab }: { colab: any }) {
  return (
    <Link href={`/colab/${colab.slug}`}>
      <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
        <h3 className="font-medium text-gray-900 mb-1">{colab.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{colab.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FiGitBranch className="text-gray-400" />
            0 forks
          </span>
          <span className="flex items-center gap-1">
            <FiUsers className="text-gray-400" />
            0 contributors
          </span>
        </div>
      </div>
    </Link>
  )
}