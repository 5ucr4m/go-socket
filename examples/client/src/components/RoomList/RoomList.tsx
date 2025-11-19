import { memo } from 'react'
import { Room } from '../../models'

interface RoomListProps {
  rooms: Room[]
  activeRoomId: string
  onRoomChange: (roomId: string) => void
}

export const RoomList = memo(({ rooms, activeRoomId, onRoomChange }: RoomListProps) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">Salas</h2>
      <div className="space-y-2">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              activeRoomId === room.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{room.name}</span>
              <span className="text-xs opacity-70">
                {room.presence.length}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

RoomList.displayName = 'RoomList'
