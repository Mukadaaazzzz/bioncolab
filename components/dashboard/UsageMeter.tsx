import { FiZap } from 'react-icons/fi'

interface UsageMeterProps {
  used: number
  total: number
  label: string
  icon: React.ReactNode
}

export default function UsageMeter({ used, total, label, icon }: UsageMeterProps) {
  const percentage = Math.min(100, (used / total) * 100)
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {icon}
          <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs font-medium text-gray-500">
          {used} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}