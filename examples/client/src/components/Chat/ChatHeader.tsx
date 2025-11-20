import { memo } from 'react'
import { User } from '../../models'

interface ChatHeaderProps {
  username: string
  isConnected: boolean
  isReconnecting: boolean
  typingUsers: User[]
  presenceCount: number
  roomName: string
}

export const ChatHeader = memo(({ isConnected, isReconnecting, typingUsers, presenceCount, roomName }: ChatHeaderProps) => {
  return (
    <header className="bg-[#F0F2F5] border-b border-gray-300 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Room info */}
        <div className="flex items-center gap-3">
          {/* Room avatar */}
          <div className="avatar">
            {roomName.charAt(0)}
          </div>

          {/* Room name and status */}
          <div>
            <h2 className="text-gray-900 font-medium text-base">
              {roomName}
            </h2>

            {/* Typing indicator ou presence count */}
            {typingUsers.length > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-purple-600">
                <div className="flex gap-0.5">
                  <span className="typing-dot w-1 h-1 bg-purple-600 rounded-full inline-block"></span>
                  <span className="typing-dot w-1 h-1 bg-purple-600 rounded-full inline-block"></span>
                  <span className="typing-dot w-1 h-1 bg-purple-600 rounded-full inline-block"></span>
                </div>
                <span className="font-medium">
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                {presenceCount} {presenceCount === 1 ? 'pessoa' : 'pessoas'} online
              </p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span className={`status-indicator ${
              isReconnecting ? 'status-reconnecting' : isConnected ? 'status-online' : 'status-offline'
            }`}></span>
            <span className="text-xs text-gray-600 hidden sm:inline">
              {isReconnecting ? 'Reconectando...' : isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 text-gray-600">
            <button
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Pesquisar mensagens"
            >
              🔍
            </button>
            <button
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Mais opções"
            >
              ⋮
            </button>
          </div>
        </div>
      </div>
    </header>
  )
})

ChatHeader.displayName = 'ChatHeader'
