import { ClientEvent, ServerMessage, User } from '../models'
import { useWebSocketStore } from '../stores/useWebSocketStore'

type MessageHandler = (data: ServerMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private maxReconnectAttempts = 5
  private baseReconnectDelay = 2000
  private isIntentionalDisconnect = false

  connect(url: string = 'ws://localhost:8080/ws') {
    this.isIntentionalDisconnect = false

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket já está conectado')
      return
    }

    console.log('🔌 Conectando ao WebSocket...', url)
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('✅ Conectado ao servidor WebSocket')
      const wsStore = useWebSocketStore.getState()
      wsStore.setConnected(true)
      wsStore.setReconnecting(false)
      wsStore.resetReconnectAttempts()
    }

    this.ws.onmessage = (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data)
        console.log('📨 Mensagem recebida:', data)

        // Notifica todos os handlers registrados
        this.messageHandlers.forEach(handler => handler(data))
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('❌ Erro WebSocket:', error)
    }

    this.ws.onclose = () => {
      console.log('🔌 Conexão fechada')
      const wsStore = useWebSocketStore.getState()
      wsStore.setConnected(false)

      // Tenta reconectar automaticamente, exceto se foi desconexão intencional
      if (!this.isIntentionalDisconnect) {
        this.attemptReconnect()
      }
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    const wsStore = useWebSocketStore.getState()
    wsStore.setConnected(false)
    wsStore.setReconnecting(false)
    wsStore.resetReconnectAttempts()
  }

  private attemptReconnect() {
    const wsStore = useWebSocketStore.getState()

    if (wsStore.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Número máximo de tentativas de reconexão atingido')
      wsStore.setReconnecting(false)
      return
    }

    wsStore.incrementReconnectAttempts()
    wsStore.setReconnecting(true)

    const delay = this.baseReconnectDelay * wsStore.reconnectAttempts
    console.log(
      `🔄 Tentando reconectar em ${delay / 1000}s... (tentativa ${wsStore.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Reconectando...')
      this.connect()
    }, delay)
  }

  send(event: ClientEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket não está conectado')
      return false
    }

    try {
      this.ws.send(JSON.stringify(event))
      return true
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      return false
    }
  }

  // Métodos específicos de ações
  subscribeToRoom(roomId: string, user: User, history = false, limit = 50) {
    return this.send({
      type: 'subscribe',
      room: roomId,
      user,
      options: { history, limit },
    })
  }

  unsubscribeFromRoom(roomId: string, user: User) {
    return this.send({
      type: 'unsubscribe',
      room: roomId,
      user,
    })
  }

  enablePresence(roomId: string, user: User) {
    return this.send({
      type: 'presence',
      room: roomId,
      user,
    })
  }

  publishMessage(roomId: string, user: User, message: string) {
    return this.send({
      type: 'publish',
      room: roomId,
      user,
      payload: {
        message,
        type: 'text',
      },
    })
  }

  sendTypingIndicator(roomId: string, user: User, isTyping: boolean) {
    return this.send({
      type: 'typing',
      room: roomId,
      user,
      isTyping,
    })
  }

  sendDirectMessage(toUserId: string, user: User, message: string) {
    return this.send({
      type: 'direct_msg',
      toUserId,
      user,
      payload: {
        message,
        type: 'text',
      },
    })
  }

  editMessage(roomId: string, messageId: string, user: User, newText: string) {
    return this.send({
      type: 'edit_message',
      room: roomId,
      messageId,
      user,
      payload: {
        message: newText,
        type: 'text',
      },
    })
  }

  sendReadReceipt(roomId: string, messageId: string, user: User) {
    return this.send({
      type: 'read_receipt',
      room: roomId,
      messageId,
      user,
    })
  }

  // Registro de handlers
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)

    // Retorna função para remover o handler
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// Singleton instance
export const wsService = new WebSocketService()
