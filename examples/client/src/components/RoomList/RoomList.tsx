import { memo } from 'react'
import { Room } from '../../models'

interface RoomListProps {
  rooms: Room[]
  activeRoomId: string
  onRoomChange: (roomId: string) => void
}

export const RoomList = memo(({ rooms, activeRoomId, onRoomChange }: RoomListProps) => {
  // Helper to get last message from room
  const getLastMessage = (room: Room) => {
    if (room.messages.length === 0) return 'Nenhuma mensagem ainda'
    const lastMsg = room.messages[room.messages.length - 1]
    if (lastMsg.type === 'system') return lastMsg.text
    if (lastMsg.isDeleted) return '🚫 Mensagem apagada'
    return lastMsg.text.length > 40 ? lastMsg.text.slice(0, 40) + '...' : lastMsg.text
  }

  // Helper to get last message time
  const getLastMessageTime = (room: Room) => {
    if (room.messages.length === 0) return ''
    const lastMsg = room.messages[room.messages.length - 1]
    const date = new Date(lastMsg.timestamp)
    const now = new Date()

    // Se foi hoje, mostrar apenas hora
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    // Se foi ontem
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    }

    // Caso contrário, mostrar data
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="flex flex-col">
      {rooms.map(room => {
        const isActive = activeRoomId === room.id

        return (
          <button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            className={`conversation-item w-full text-left px-3 py-3 flex items-center gap-3 border-b border-gray-700 ${
              isActive ? 'active' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`avatar-sm flex-shrink-0 ${
              isActive ? 'ring-2 ring-white' : ''
            }`}>
              {room.name.charAt(0)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Room name and time */}
              <div className="flex items-baseline justify-between mb-0.5">
                <h3 className={`font-medium text-sm truncate ${
                  isActive ? 'text-white' : 'text-gray-100'
                }`}>
                  {room.name}
                </h3>
                <span className={`text-xs flex-shrink-0 ml-2 ${
                  isActive ? 'text-purple-200' : 'text-gray-400'
                }`}>
                  {getLastMessageTime(room)}
                </span>
              </div>

              {/* Last message and badge */}
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs truncate ${
                  isActive ? 'text-purple-100' : 'text-gray-400'
                }`}>
                  {getLastMessage(room)}
                </p>

                {/* Online count badge */}
                {room.presence.length > 0 && (
                  <span className={`unread-badge text-xs ${
                    isActive ? 'bg-white text-purple-600' : ''
                  }`}>
                    {room.presence.length}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})

RoomList.displayName = 'RoomList'
