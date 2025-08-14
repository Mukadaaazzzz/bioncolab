'use client'

import { FiAlertTriangle, FiX } from 'react-icons/fi'

interface ConfirmModalProps {
  isOpen: boolean
   onCloseAction: () => void
  onConfirmAction: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isConfirming?: boolean
  confirmColor?: 'red' | 'blue' | 'green'
}

export default function ConfirmModal({
  isOpen,
  onCloseAction,
  onConfirmAction,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
  confirmColor = 'blue'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button onClick={onCloseAction} className="text-gray-400 hover:text-gray-500">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCloseAction}
            disabled={isConfirming}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirmAction}
            disabled={isConfirming}
            className={`px-4 py-2 text-white rounded-lg ${colorClasses[confirmColor]} disabled:opacity-50`}
          >
            {isConfirming ? (
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}