import { FiGitCommit, FiUpload, FiUserPlus, FiBook } from 'react-icons/fi'

const activities = [
  {
    id: 1,
    type: 'commit',
    user: 'Dr. Sarah Chen',
    lab: 'Neuroplasticity in Aging',
    time: '2 hours ago',
    icon: <FiGitCommit className="text-green-500" />
  },
  {
    id: 2,
    type: 'upload',
    user: 'You',
    lab: 'CRISPR Efficiency',
    time: '5 hours ago',
    icon: <FiUpload className="text-blue-500" />
  },
  {
    id: 3,
    type: 'join',
    user: 'Prof. James Wilson',
    lab: 'Quantum Biology',
    time: '1 day ago',
    icon: <FiUserPlus className="text-purple-500" />
  },
  {
    id: 4,
    type: 'fork',
    user: 'Dr. Maria Garcia',
    lab: 'Your Cancer Biomarkers',
    time: '2 days ago',
    icon: <FiBook className="text-orange-500" />
  }
]

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <li key={activity.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <div className="bg-gray-100 p-2 rounded-lg">
                  {activity.icon}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{activity.user}</span> {getActionText(activity.type)} <span className="font-medium">{activity.lab}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="bg-gray-50 px-4 py-3 text-right">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View all activity
        </button>
      </div>
    </div>
  )
}

function getActionText(type: string) {
  switch (type) {
    case 'commit':
      return 'made a new commit in'
    case 'upload':
      return 'uploaded files to'
    case 'join':
      return 'joined'
    case 'fork':
      return 'forked'
    default:
      return 'updated'
  }
}