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

export const ChatHeader = memo(({ username, isConnected, isReconnecting, typingUsers, presenceCount, roomName }: ChatHeaderProps) => {
  return (
    <>
      {/* Header Principal */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {username[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Go-Socket Rooms</h1>
                <p className="text-sm text-gray-600">{username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isReconnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Conectado' : isReconnecting ? 'Reconectando...' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Header da Sala */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{roomName}</h2>
        <p className="text-sm text-gray-600">
          {presenceCount} {presenceCount === 1 ? 'pessoa' : 'pessoas'} online
        </p>
        {typingUsers.length > 0 && (
          <p className="text-xs text-purple-600 italic mt-1">
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
          </p>
        )}
      </div>
    </>
  )
})

ChatHeader.displayName = 'ChatHeader'
