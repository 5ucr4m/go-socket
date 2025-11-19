import { useState, useCallback, FormEvent, memo } from 'react'
import { useUserStore, useRoomStore, useWebSocketStore } from '../../stores'
import { useWebSocket } from '../../hooks'
import { RoomList } from '../RoomList'
import { PresenceList } from '../PresenceList'
import { MessageList } from '../MessageList'
import { MessageInput } from '../MessageInput'
import { ChatHeader } from './ChatHeader'

export const ChatView = memo(() => {
  const [inputMessage, setInputMessage] = useState('')

  // Stores
  const { username, userId } = useUserStore()
  const { rooms, activeRoomId, setActiveRoomId, getActiveRoom } = useRoomStore()
  const { isConnected, isReconnecting } = useWebSocketStore()

  // WebSocket hook
  const { sendMessage, editMessage, sendDirectMessage, handleInputChange } = useWebSocket()

  const activeRoom = getActiveRoom()

  // Handlers
  const handleRoomChange = useCallback((roomId: string) => {
    setActiveRoomId(roomId)
  }, [setActiveRoomId])

  const handleSendMessage = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!inputMessage.trim() || !isConnected) {
      return
    }

    sendMessage(activeRoomId, inputMessage.trim())
    setInputMessage('')
  }, [inputMessage, isConnected, sendMessage, activeRoomId])

  const handleInputChangeWithTyping = useCallback((value: string) => {
    setInputMessage(value)
    handleInputChange(activeRoomId, value)
  }, [activeRoomId, handleInputChange])

  const handleEditMessage = useCallback((messageId: string, newText: string) => {
    editMessage(activeRoomId, messageId, newText)
  }, [editMessage, activeRoomId])

  const handleSendDirectMessage = useCallback((toUserId: string, userName: string) => {
    const msg = prompt(`Enviar mensagem direta para ${userName}:`)
    if (msg && msg.trim()) {
      sendDirectMessage(toUserId, msg.trim())
    }
  }, [sendDirectMessage])

  return (
    <div className="min-h-screen bg-gray-100">
      <ChatHeader
        username={username}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        typingUsers={activeRoom.typingUsers}
        presenceCount={activeRoom.presence.length}
        roomName={activeRoom.name}
      />

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {/* Sidebar - Rooms & Presence */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
            <RoomList
              rooms={rooms}
              activeRoomId={activeRoomId}
              onRoomChange={handleRoomChange}
            />

            <PresenceList
              users={activeRoom.presence}
              currentUserId={userId}
              onSendDirectMessage={handleSendDirectMessage}
            />
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-lg flex flex-col">
            <MessageList
              messages={activeRoom.messages}
              onEditMessage={handleEditMessage}
            />

            <MessageInput
              value={inputMessage}
              onChange={handleInputChangeWithTyping}
              onSubmit={handleSendMessage}
              isConnected={isConnected}
              roomName={activeRoom.name}
            />
          </div>
        </div>
      </main>
    </div>
  )
})

ChatView.displayName = 'ChatView'
