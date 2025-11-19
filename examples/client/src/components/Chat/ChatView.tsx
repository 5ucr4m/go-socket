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
  const { sendMessage, editMessage, deleteMessage, sendDirectMessage, handleInputChange } = useWebSocket()

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

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (confirm('Tem certeza que deseja apagar esta mensagem?')) {
      deleteMessage(activeRoomId, messageId)
    }
  }, [deleteMessage, activeRoomId])

  const handleSendDirectMessage = useCallback((toUserId: string, userName: string) => {
    const msg = prompt(`Enviar mensagem direta para ${userName}:`)
    if (msg && msg.trim()) {
      sendDirectMessage(toUserId, msg.trim())
    }
  }, [sendDirectMessage])

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      {/* Sidebar - WhatsApp Dark Style */}
      <div className="w-full lg:w-96 flex-shrink-0 sidebar-dark flex flex-col border-r border-gray-700">
        {/* Sidebar Header */}
        <div className="px-4 py-3 bg-[#2A2F32] border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="avatar avatar-lg">
                {username.charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-medium">{username}</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`status-indicator ${
                    isReconnecting ? 'status-reconnecting' : isConnected ? 'status-online' : 'status-offline'
                  }`}></span>
                  <span className="text-gray-400">
                    {isReconnecting ? 'Reconectando...' : isConnected ? 'Online' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 bg-[#1F2427]">
          <div className="bg-[#323739] rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              className="bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 w-full"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto sidebar-dark">
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            onRoomChange={handleRoomChange}
          />

          <div className="border-t border-gray-700 mt-2 pt-2">
            <PresenceList
              users={activeRoom.presence}
              currentUserId={userId}
              onSendDirectMessage={handleSendDirectMessage}
            />
          </div>
        </div>
      </div>

      {/* Chat Area - WhatsApp Style */}
      <div className="flex-1 flex flex-col">
        <ChatHeader
          username={username}
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          typingUsers={activeRoom.typingUsers}
          presenceCount={activeRoom.presence.length}
          roomName={activeRoom.name}
        />

        {/* Messages Area with WhatsApp Background */}
        <div className="flex-1 whatsapp-chat-bg overflow-hidden">
          <MessageList
            messages={activeRoom.messages}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>

        {/* Input Area */}
        <MessageInput
          value={inputMessage}
          onChange={handleInputChangeWithTyping}
          onSubmit={handleSendMessage}
          isConnected={isConnected}
          roomName={activeRoom.name}
        />
      </div>
    </div>
  )
})

ChatView.displayName = 'ChatView'
