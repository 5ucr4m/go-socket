export interface Message {
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
