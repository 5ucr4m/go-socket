import { useState, useEffect, useRef, FormEvent } from 'react'
import './App.css'

// ===== Interfaces =====

interface User {
  id: string
  name: string
}

interface ClientEvent {
  type: 'subscribe' | 'unsubscribe' | 'publish' | 'presence' | 'typing' | 'read_receipt' | 'direct_msg' | 'edit_message'
  room?: string
  user?: User
  payload?: any
  options?: {
    history?: boolean
    limit?: number
  }
  toUserId?: string
  messageId?: string
  isTyping?: boolean
}

interface ServerMessage {
  type: 'message' | 'history' | 'presence_list' | 'user_joined' | 'user_left' | 'typing' | 'read_receipt' | 'direct_message' | 'message_edited' | 'error'
  room?: string
  payload?: {
    message: string
    type: string
  }
  user?: User
  metadata?: {
    room: string
    createdAt: string
    editedAt?: string
    isEdited?: boolean
  }
  presenceList?: User[]
  isTyping?: boolean
  messageId?: string
  error?: string
}

interface Message {
  id: string
  type: 'sent' | 'received' | 'system' | 'dm'
  text: string
  username?: string
  timestamp: string
  isHistory?: boolean
  readBy?: string[]
  isEdited?: boolean
  editedAt?: string
}

interface Room {
  id: string
  name: string
  messages: Message[]
  presence: User[]
  typingUsers: User[]
}

// ===== Configuração de Salas =====

const AVAILABLE_ROOMS: Room[] = [
  { id: 'sala-geral', name: '💬 Geral', messages: [], presence: [], typingUsers: [] },
  { id: 'sala-de-jogos', name: '🎮 Jogos', messages: [], presence: [], typingUsers: [] },
  { id: 'sala-tech', name: '💻 Tech', messages: [], presence: [], typingUsers: [] },
]

function App() {
  // ===== Estados =====
  const [username, setUsername] = useState('')
  const [isUsernameSet, setIsUsernameSet] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [rooms, setRooms] = useState<Room[]>(AVAILABLE_ROOMS)
  const [activeRoomId, setActiveRoomId] = useState('sala-geral')
  const [inputMessage, setInputMessage] = useState('')
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const userIdRef = useRef<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ===== Helpers =====

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeRoom.messages])

  // ===== WebSocket =====

  const connectWebSocket = () => {
    if (!isUsernameSet) return

    // Gera ID único na primeira vez
    if (!userIdRef.current) {
      userIdRef.current = 'user-' + Math.random().toString(36).substr(2, 9)
    }

    const ws = new WebSocket('ws://localhost:8080/ws')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('✅ Conectado ao servidor WebSocket')
      setIsConnected(true)
      setIsReconnecting(false)
      reconnectAttemptsRef.current = 0

      // Subscribe em todas as salas com histórico
      AVAILABLE_ROOMS.forEach(room => {
        subscribeToRoom(room.id, true, 50)
        enablePresence(room.id)
      })
    }

    ws.onmessage = (event) => {
      console.log('📨 Mensagem recebida:', event.data)
      try {
        const data: ServerMessage = JSON.parse(event.data)
        handleServerMessage(data)
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('❌ Erro WebSocket:', error)
    }

    ws.onclose = () => {
      console.log('🔌 Conexão fechada')
      setIsConnected(false)

      // Tenta reconectar automaticamente
      if (isUsernameSet) {
        attemptReconnect()
      }
    }
  }

  const attemptReconnect = () => {
    const maxAttempts = 5
    const baseDelay = 2000 // 2 segundos

    if (reconnectAttemptsRef.current >= maxAttempts) {
      console.log('❌ Número máximo de tentativas de reconexão atingido')
      setIsReconnecting(false)
      return
    }

    reconnectAttemptsRef.current++
    setIsReconnecting(true)

    const delay = baseDelay * reconnectAttemptsRef.current
    console.log(`🔄 Tentando reconectar em ${delay/1000}s... (tentativa ${reconnectAttemptsRef.current}/${maxAttempts})`)

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Reconectando...')
      connectWebSocket()
    }, delay)
  }

  useEffect(() => {
    if (!isUsernameSet) return

    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [isUsernameSet])

  // ===== Funções de Mensageria =====

  const subscribeToRoom = (roomId: string, history = false, limit = 0) => {
    if (!wsRef.current) return

    const event: ClientEvent = {
      type: 'subscribe',
      room: roomId,
      user: {
        id: userIdRef.current,
        name: username
      },
      options: { history, limit }
    }

    wsRef.current.send(JSON.stringify(event))
    console.log(`📥 Subscribe: ${roomId} (history: ${history}, limit: ${limit})`)
  }

  const enablePresence = (roomId: string) => {
    if (!wsRef.current) return

    const event: ClientEvent = {
      type: 'presence',
      room: roomId,
      user: {
        id: userIdRef.current,
        name: username
      }
    }

    wsRef.current.send(JSON.stringify(event))
    console.log(`👥 Presence ativado: ${roomId}`)
  }

  const sendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const event: ClientEvent = {
      type: 'publish',
      room: activeRoomId,
      user: {
        id: userIdRef.current,
        name: username
      },
      payload: {
        message: inputMessage,
        type: 'text'
      }
    }

    wsRef.current.send(JSON.stringify(event))
    setInputMessage('')

    // Para de enviar typing indicator
    sendTypingIndicator(false)
  }

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const event: ClientEvent = {
      type: 'typing',
      room: activeRoomId,
      user: {
        id: userIdRef.current,
        name: username
      },
      isTyping
    }

    wsRef.current.send(JSON.stringify(event))
  }

  const handleInputChange = (value: string) => {
    setInputMessage(value)

    // Envia typing indicator
    if (value.length > 0) {
      sendTypingIndicator(true)

      // Limpa timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Para de enviar typing após 3 segundos de inatividade
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false)
      }, 3000)
    } else {
      sendTypingIndicator(false)
    }
  }

  const sendDirectMessage = (toUserId: string, message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const event: ClientEvent = {
      type: 'direct_msg',
      toUserId,
      user: {
        id: userIdRef.current,
        name: username
      },
      payload: {
        message,
        type: 'text'
      }
    }

    wsRef.current.send(JSON.stringify(event))
    console.log(`📤 Mensagem direta enviada para ${toUserId}`)
  }

  const editMessage = (messageId: string, newText: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const event: ClientEvent = {
      type: 'edit_message',
      room: activeRoomId,
      messageId,
      user: {
        id: userIdRef.current,
        name: username
      },
      payload: {
        message: newText,
        type: 'text'
      }
    }

    wsRef.current.send(JSON.stringify(event))
    console.log(`✏️ Editando mensagem ${messageId}`)
  }

  // ===== Tratamento de Mensagens do Servidor =====

  const handleServerMessage = (data: ServerMessage) => {
    switch (data.type) {
      case 'message':
        handleNewMessage(data, false)
        break

      case 'history':
        handleNewMessage(data, true)
        break

      case 'presence_list':
        handlePresenceList(data)
        break

      case 'user_joined':
        handleUserJoined(data)
        break

      case 'user_left':
        handleUserLeft(data)
        break

      case 'typing':
        handleTypingIndicator(data)
        break

      case 'read_receipt':
        handleReadReceipt(data)
        break

      case 'direct_message':
        handleDirectMessage(data)
        break

      case 'message_edited':
        handleMessageEdited(data)
        break

      case 'error':
        console.error('❌ Erro do servidor:', data.error)
        alert(data.error)
        break
    }
  }

  const handleNewMessage = (data: ServerMessage, isHistory: boolean) => {
    if (!data.metadata?.room) return

    const roomId = data.metadata.room
    const messageText = data.payload?.message || ''
    const messageSender = data.user?.name || 'Anônimo'
    const isSentByMe = data.user?.id === userIdRef.current

    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room

      const newMessage: Message = {
        id: data.messageId || Math.random().toString(36).substr(2, 9),
        type: isSentByMe ? 'sent' : 'received',
        text: messageText,
        username: messageSender,
        timestamp: data.metadata?.createdAt || new Date().toISOString(),
        isHistory,
        isEdited: data.metadata?.isEdited || false,
        editedAt: data.metadata?.editedAt
      }

      return {
        ...room,
        messages: [...room.messages, newMessage]
      }
    }))
  }

  const handlePresenceList = (data: ServerMessage) => {
    if (!data.room) return

    setRooms(prev => prev.map(room => {
      if (room.id !== data.room) return room
      return {
        ...room,
        presence: data.presenceList || []
      }
    }))
  }

  const handleUserJoined = (data: ServerMessage) => {
    if (!data.room || !data.user) return

    // Atualiza presence list
    setRooms(prev => prev.map(room => {
      if (room.id !== data.room) return room

      // Verifica se usuário já está na lista
      if (room.presence.some(u => u.id === data.user!.id)) {
        return room
      }

      // Adiciona mensagem de sistema
      const systemMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'system',
        text: `${data.user!.name} entrou na sala`,
        timestamp: new Date().toISOString()
      }

      return {
        ...room,
        presence: [...room.presence, data.user!],
        messages: [...room.messages, systemMessage]
      }
    }))
  }

  const handleUserLeft = (data: ServerMessage) => {
    if (!data.room || !data.user) return

    setRooms(prev => prev.map(room => {
      if (room.id !== data.room) return room

      // Adiciona mensagem de sistema
      const systemMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'system',
        text: `${data.user!.name} saiu da sala`,
        timestamp: new Date().toISOString()
      }

      return {
        ...room,
        presence: room.presence.filter(u => u.id !== data.user!.id),
        messages: [...room.messages, systemMessage]
      }
    }))
  }

  const handleTypingIndicator = (data: ServerMessage) => {
    if (!data.room || !data.user) return

    setRooms(prev => prev.map(room => {
      if (room.id !== data.room) return room

      let typingUsers = [...room.typingUsers]

      if (data.isTyping) {
        // Adiciona usuário à lista de digitando (se não estiver já)
        if (!typingUsers.some(u => u.id === data.user!.id)) {
          typingUsers.push(data.user!)
        }
      } else {
        // Remove usuário da lista de digitando
        typingUsers = typingUsers.filter(u => u.id !== data.user!.id)
      }

      return {
        ...room,
        typingUsers
      }
    }))
  }

  const handleReadReceipt = (data: ServerMessage) => {
    if (!data.room || !data.messageId || !data.user) return

    setRooms(prev => prev.map(room => {
      if (room.id !== data.room) return room

      return {
        ...room,
        messages: room.messages.map(msg => {
          if (msg.id === data.messageId) {
            const readBy = msg.readBy || []
            if (!readBy.includes(data.user!.id)) {
              return {
                ...msg,
                readBy: [...readBy, data.user!.id]
              }
            }
          }
          return msg
        })
      }
    }))
  }

  const handleDirectMessage = (data: ServerMessage) => {
    if (!data.user || !data.payload) return

    // Mostra notificação
    const messageText = data.payload.message || ''
    console.log(`📬 Mensagem direta de ${data.user.name}: ${messageText}`)
    alert(`📬 Mensagem direta de ${data.user.name}:\n${messageText}`)
  }

  const handleMessageEdited = (data: ServerMessage) => {
    if (!data.room || !data.messageId) return

    const roomId = data.room
    const messageText = data.payload?.message || ''

    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room

      return {
        ...room,
        messages: room.messages.map(msg => {
          if (msg.id === data.messageId) {
            return {
              ...msg,
              text: messageText,
              isEdited: true,
              editedAt: data.metadata?.editedAt || new Date().toISOString()
            }
          }
          return msg
        })
      }
    }))

    console.log(`✏️ Mensagem ${data.messageId} editada na sala ${roomId}`)
  }

  // ===== Event Handlers =====

  const handleUsernameSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (username.trim()) {
      setIsUsernameSet(true)
    }
  }

  // ===== Renderização =====

  // Tela de login
  if (!isUsernameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎮 Go-Socket</h1>
            <p className="text-gray-600">Sistema de Chat com Pub/Sub e Presence</p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Escolha seu nome de usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu nome..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Entrar no Chat
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Tela de chat
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {/* Sidebar - Rooms */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Salas</h2>
            <div className="space-y-2">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
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

            {/* Presence List */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">
                Online ({activeRoom.presence.length})
              </h3>
              <div className="space-y-2">
                {activeRoom.presence.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Ninguém online</p>
                ) : (
                  activeRoom.presence.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 text-sm text-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className={user.id === userIdRef.current ? 'font-semibold' : ''}>
                          {user.name}
                          {user.id === userIdRef.current && ' (você)'}
                        </span>
                      </div>
                      {user.id !== userIdRef.current && (
                        <button
                          onClick={() => {
                            const msg = prompt(`Enviar mensagem direta para ${user.name}:`)
                            if (msg && msg.trim()) {
                              sendDirectMessage(user.id, msg.trim())
                            }
                          }}
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
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-lg flex flex-col">
            {/* Room Header */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{activeRoom.name}</h2>
              <p className="text-sm text-gray-600">
                {activeRoom.presence.length} {activeRoom.presence.length === 1 ? 'pessoa' : 'pessoas'} online
              </p>
              {activeRoom.typingUsers.length > 0 && (
                <p className="text-xs text-purple-600 italic mt-1">
                  {activeRoom.typingUsers.map(u => u.name).join(', ')} {activeRoom.typingUsers.length === 1 ? 'está' : 'estão'} digitando...
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeRoom.messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm mt-2">Seja o primeiro a enviar uma mensagem!</p>
                </div>
              )}

              {activeRoom.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'system' ? 'justify-center' : msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'system' ? (
                    <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-w-xs md:max-w-md">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          msg.type === 'sent'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {msg.type === 'received' && (
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {msg.username}
                          </p>
                        )}

                        {editingMessageId === msg.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              defaultValue={msg.text}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const newText = e.currentTarget.value.trim()
                                  if (newText && newText !== msg.text) {
                                    editMessage(msg.id, newText)
                                  }
                                  setEditingMessageId(null)
                                } else if (e.key === 'Escape') {
                                  setEditingMessageId(null)
                                }
                              }}
                              autoFocus
                              className="bg-white text-gray-800 px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            <div className="flex gap-2 text-xs">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="text-red-300 hover:text-red-100"
                              >
                                Cancelar (Esc)
                              </button>
                              <span className="opacity-50">Enter para salvar</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{msg.text}</p>
                        )}

                        <p className="text-xs opacity-70 mt-1 flex items-center gap-2">
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {msg.isEdited && (
                            <span className="text-xs italic">
                              (editada)
                            </span>
                          )}
                          {msg.isHistory && (
                            <span className="text-xs bg-black bg-opacity-20 px-2 py-0.5 rounded">
                              histórico
                            </span>
                          )}
                          {msg.type === 'sent' && msg.readBy && msg.readBy.length > 0 && (
                            <span className="text-xs">✓✓</span>
                          )}
                        </p>
                      </div>

                      {msg.type === 'sent' && !msg.isHistory && editingMessageId !== msg.id && (
                        <button
                          onClick={() => setEditingMessageId(msg.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 self-end"
                          title="Editar mensagem"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={`Mensagem em ${activeRoom.name}...`}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!isConnected || !inputMessage.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
