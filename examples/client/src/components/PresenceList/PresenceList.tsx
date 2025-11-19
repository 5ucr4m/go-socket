import { memo } from 'react'
import { User } from '../../models'

interface PresenceListProps {
  users: User[]
  currentUserId: string
  onSendDirectMessage: (userId: string, userName: string) => void
}

export const PresenceList = memo(({ users, currentUserId, onSendDirectMessage }: PresenceListProps) => {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">
        Online ({users.length})
      </h3>
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Ninguém online</p>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-2 text-sm text-gray-700"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className={user.id === currentUserId ? 'font-semibold' : ''}>
                  {user.name}
                  {user.id === currentUserId && ' (você)'}
                </span>
              </div>
              {user.id !== currentUserId && (
                <button
                  onClick={() => onSendDirectMessage(user.id, user.name)}
                  className="text-purple-600 hover:text-purple-800 text-xs"
                  title="Enviar mensagem direta"
                >
                  💬
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
})

PresenceList.displayName = 'PresenceList'
