import { useEffect, useCallback, useRef } from 'react'
import { wsService, MessageHandler } from '../services'
import { useUserStore, useRoomStore } from '../stores'

export const useWebSocket = () => {
  const { userId, username } = useUserStore()
  const { rooms } = useRoomStore()
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitialized = useRef(false)

  // Conecta ao WebSocket quando o usuário está logado
  useEffect(() => {
    if (!userId || !username) return

    // Evita múltiplas conexões
    if (hasInitialized.current) return
    hasInitialized.current = true

    console.log('🔌 Iniciando conexão WebSocket...')
    wsService.connect()

    // Registra handler de mensagens
    const unsubscribe = wsService.onMessage((data) => {
      MessageHandler.handle(data)
    })

    // Aguarda conexão antes de fazer subscribe
    const checkConnection = setInterval(() => {
      if (wsService.isConnected()) {
        clearInterval(checkConnection)

        // Subscribe em todas as salas com histórico
        console.log('📥 Subscribing to all rooms...')
        rooms.forEach(room => {
          wsService.subscribeToRoom(room.id, { id: userId, name: username }, true, 50)
          wsService.enablePresence(room.id, { id: userId, name: username })
        })
      }
    }, 100)

    // Cleanup
    return () => {
      clearInterval(checkConnection)
      unsubscribe()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      wsService.disconnect()
      hasInitialized.current = false
    }
  }, [userId, username, rooms])

  // Ações
  const sendMessage = useCallback((roomId: string, message: string) => {
    if (!userId || !username) return

    wsService.publishMessage(roomId, { id: userId, name: username }, message)
  }, [userId, username])

  const editMessage = useCallback((roomId: string, messageId: string, newText: string) => {
    if (!userId || !username) return

    wsService.editMessage(roomId, messageId, { id: userId, name: username }, newText)
  }, [userId, username])

  const deleteMessage = useCallback((roomId: string, messageId: string) => {
    if (!userId || !username) return

    wsService.deleteMessage(roomId, messageId, { id: userId, name: username })
  }, [userId, username])

  const sendDirectMessage = useCallback((toUserId: string, message: string) => {
    if (!userId || !username) return

    wsService.sendDirectMessage(toUserId, { id: userId, name: username }, message)
  }, [userId, username])

  const sendTypingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    if (!userId || !username) return

    wsService.sendTypingIndicator(roomId, { id: userId, name: username }, isTyping)
  }, [userId, username])

  const handleInputChange = useCallback((roomId: string, value: string) => {
    if (!userId || !username) return

    // Envia typing indicator
    if (value.length > 0) {
      sendTypingIndicator(roomId, true)

      // Limpa timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Para de enviar typing após 3 segundos de inatividade
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(roomId, false)
      }, 3000)
    } else {
      sendTypingIndicator(roomId, false)
    }
  }, [userId, username, sendTypingIndicator])

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    sendDirectMessage,
    sendTypingIndicator,
    handleInputChange,
  }
}
