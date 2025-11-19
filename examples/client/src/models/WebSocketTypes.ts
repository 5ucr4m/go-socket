import { User } from './User'

export interface ClientEvent {
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

export interface ServerMessage {
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
