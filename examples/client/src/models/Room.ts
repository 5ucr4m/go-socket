import { User } from './User'
import { Message } from './Message'

export interface Room {
  id: string
  name: string
  messages: Message[]
  presence: User[]
  typingUsers: User[]
}
