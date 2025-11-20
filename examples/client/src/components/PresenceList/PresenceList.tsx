import { memo } from 'react'
import { User } from '../../models'

interface PresenceListProps {
  users: User[]
  currentUserId: string
  onSendDirectMessage: (userId: string, userName: string) => void
}

export const PresenceList = memo(({ users, currentUserId, onSendDirectMessage }: PresenceListProps) => {
  return (
    <div className="px-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-3">
        Online ({users.length})
      </h3>
      <div className="flex flex-col">
        {users.length === 0 ? (
          <p className="text-xs text-gray-500 italic px-3 py-2">Ninguém online</p>
        ) : (
          users.map(user => {
            const isCurrentUser = user.id === currentUserId

            return (
              <button
                key={user.id}
                onClick={() => !isCurrentUser && onSendDirectMessage(user.id, user.name)}
                disabled={isCurrentUser}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 ${
                  !isCurrentUser ? 'hover:bg-[#323739] cursor-pointer' : 'cursor-default'
                } transition-colors`}
              >
                {/* Avatar */}
                <div className="avatar-sm flex-shrink-0 relative">
                  {user.name.charAt(0).toUpperCase()}
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#2A2F32] rounded-full"></span>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    isCurrentUser ? 'text-gray-100 font-semibold' : 'text-gray-200'
                  }`}>
                    {user.name}
                    {isCurrentUser && ' (você)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isCurrentUser ? 'Seu perfil' : 'Clique para enviar DM'}
                  </p>
                </div>

                {/* Action icon */}
                {!isCurrentUser && (
                  <div className="flex-shrink-0 text-gray-400">
                    💬
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
})

PresenceList.displayName = 'PresenceList'
