import { useState, useEffect, useRef, FormEvent } from 'react'
import './App.css'

interface Message {
  type: 'sent' | 'received' | 'system' | 'error'
  text: string
  timestamp: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState('')
  const [isUsernameSet, setIsUsernameSet] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Conectar ao WebSocket quando o username for definido
  useEffect(() => {
    if (!isUsernameSet) return

    const ws = new WebSocket('ws://localhost:8080/ws')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('✅ Conectado ao servidor WebSocket')
      setIsConnected(true)
      setMessages(prev => [...prev, {
        type: 'system',
        text: 'Conectado ao servidor!',
        timestamp: new Date().toISOString()
      }])
    }

    ws.onmessage = (event) => {
      console.log('📩 Mensagem recebida:', event.data)
      setMessages(prev => [...prev, {
        type: 'received',
        text: event.data,
        timestamp: new Date().toISOString()
      }])
    }

    ws.onerror = (error) => {
      console.error('❌ Erro WebSocket:', error)
      setMessages(prev => [...prev, {
        type: 'error',
        text: 'Erro na conexão',
        timestamp: new Date().toISOString()
      }])
    }

    ws.onclose = () => {
      console.log('🔌 Conexão fechada')
      setIsConnected(false)
      setMessages(prev => [...prev, {
        type: 'system',
        text: 'Desconectado do servidor',
        timestamp: new Date().toISOString()
      }])
    }

    return () => {
      ws.close()
    }
  }, [isUsernameSet])

  const sendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const message = `${username}: ${inputMessage}`
    wsRef.current.send(message)

    setMessages(prev => [...prev, {
      type: 'sent',
      text: message,
      timestamp: new Date().toISOString()
    }])

    setInputMessage('')
  }

  const handleUsernameSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (username.trim()) {
      setIsUsernameSet(true)
    }
  }

  // Tela de login (definir username)
  if (!isUsernameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Go-Socket</h1>
            <p className="text-gray-600">Sistema Pub-Sub em Go</p>
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {username[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Go-Socket Chat</h1>
              <p className="text-sm text-gray-600">Conectado como {username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-220px)] flex flex-col">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-sm mt-2">Envie uma mensagem para começar!</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    msg.type === 'sent'
                      ? 'bg-purple-600 text-white'
                      : msg.type === 'received'
                      ? 'bg-gray-200 text-gray-800'
                      : msg.type === 'system'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
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
      </main>
    </div>
  )
}

export default App
