import { ServerMessage, Message } from '../models'
import { useRoomStore } from '../stores/useRoomStore'
import { useUserStore } from '../stores/useUserStore'

export class MessageHandler {
  static handle(data: ServerMessage) {
    switch (data.type) {
      case 'message':
        MessageHandler.handleNewMessage(data, false)
        break

      case 'history':
        MessageHandler.handleNewMessage(data, true)
        break

      case 'presence_list':
        MessageHandler.handlePresenceList(data)
        break

      case 'user_joined':
        MessageHandler.handleUserJoined(data)
        break

      case 'user_left':
        MessageHandler.handleUserLeft(data)
        break

      case 'typing':
        MessageHandler.handleTypingIndicator(data)
        break

      case 'read_receipt':
        MessageHandler.handleReadReceipt(data)
        break

      case 'direct_message':
        MessageHandler.handleDirectMessage(data)
        break

      case 'message_edited':
        MessageHandler.handleMessageEdited(data)
        break

      case 'error':
        console.error('❌ Erro do servidor:', data.error)
        alert(`Erro: ${data.error}`)
        break
    }
  }

  private static handleNewMessage(data: ServerMessage, isHistory: boolean) {
    if (!data.metadata?.room) return

    const roomId = data.metadata.room
    const messageText = data.payload?.message || ''
    const messageSender = data.user?.name || 'Anônimo'
    const userStore = useUserStore.getState()
    const roomStore = useRoomStore.getState()
    const isSentByMe = data.user?.id === userStore.userId

    const newMessage: Message = {
      id: data.messageId || Math.random().toString(36).substr(2, 9),
      type: isSentByMe ? 'sent' : 'received',
      text: messageText,
      username: messageSender,
      timestamp: data.metadata?.createdAt || new Date().toISOString(),
      isHistory,
      isEdited: data.metadata?.isEdited || false,
      editedAt: data.metadata?.editedAt,
    }

    roomStore.addMessage(roomId, newMessage)
  }

  private static handlePresenceList(data: ServerMessage) {
    if (!data.room) return

    const roomStore = useRoomStore.getState()
    roomStore.setPresenceList(data.room, data.presenceList || [])
  }

  private static handleUserJoined(data: ServerMessage) {
    if (!data.room || !data.user) return

    const roomStore = useRoomStore.getState()
    const room = roomStore.rooms.find(r => r.id === data.room)

    // Verifica se usuário já está na lista
    if (room?.presence.some(u => u.id === data.user!.id)) {
      return
    }

    // Adiciona usuário à presence
    roomStore.addUserToPresence(data.room, data.user)

    // Adiciona mensagem de sistema
    const systemMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'system',
      text: `${data.user.name} entrou na sala`,
      timestamp: new Date().toISOString(),
    }

    roomStore.addMessage(data.room, systemMessage)
  }

  private static handleUserLeft(data: ServerMessage) {
    if (!data.room || !data.user) return

    const roomStore = useRoomStore.getState()

    // Remove usuário da presence
    roomStore.removeUserFromPresence(data.room, data.user.id)

    // Adiciona mensagem de sistema
    const systemMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'system',
      text: `${data.user.name} saiu da sala`,
      timestamp: new Date().toISOString(),
    }

    roomStore.addMessage(data.room, systemMessage)
  }

  private static handleTypingIndicator(data: ServerMessage) {
    if (!data.room || !data.user) return

    const roomStore = useRoomStore.getState()
    const room = roomStore.rooms.find(r => r.id === data.room)

    if (!room) return

    if (data.isTyping) {
      // Adiciona usuário à lista de digitando (se não estiver já)
      if (!room.typingUsers.some(u => u.id === data.user!.id)) {
        roomStore.addTypingUser(data.room, data.user)
      }
    } else {
      // Remove usuário da lista de digitando
      roomStore.removeTypingUser(data.room, data.user.id)
    }
  }

  private static handleReadReceipt(data: ServerMessage) {
    if (!data.room || !data.messageId || !data.user) return

    const roomStore = useRoomStore.getState()
    const room = roomStore.rooms.find(r => r.id === data.room)
    const message = room?.messages.find(m => m.id === data.messageId)

    if (!message) return

    const readBy = message.readBy || []
    if (!readBy.includes(data.user.id)) {
      roomStore.updateMessage(data.room, data.messageId, {
        readBy: [...readBy, data.user.id],
      })
    }
  }

  private static handleDirectMessage(data: ServerMessage) {
    if (!data.user || !data.payload) return

    const messageText = data.payload.message || ''
    console.log(`📬 Mensagem direta de ${data.user.name}: ${messageText}`)
    alert(`📬 Mensagem direta de ${data.user.name}:\n${messageText}`)
  }

  private static handleMessageEdited(data: ServerMessage) {
    if (!data.room || !data.messageId) return

    const messageText = data.payload?.message || ''
    const roomStore = useRoomStore.getState()

    roomStore.updateMessage(data.room, data.messageId, {
      text: messageText,
      isEdited: true,
      editedAt: data.metadata?.editedAt || new Date().toISOString(),
    })

    console.log(`✏️ Mensagem ${data.messageId} editada na sala ${data.room}`)
  }
}
