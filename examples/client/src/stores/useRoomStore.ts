import { create } from 'zustand'
import { Room, Message, User } from '../models'

interface RoomState {
  rooms: Room[]
  activeRoomId: string

  // Getters
  getActiveRoom: () => Room

  // Setters
  setActiveRoomId: (roomId: string) => void
  initializeRooms: (rooms: Room[]) => void

  // Message actions
  addMessage: (roomId: string, message: Message) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void

  // Presence actions
  setPresenceList: (roomId: string, users: User[]) => void
  addUserToPresence: (roomId: string, user: User) => void
  removeUserFromPresence: (roomId: string, userId: string) => void

  // Typing actions
  setTypingUsers: (roomId: string, users: User[]) => void
  addTypingUser: (roomId: string, user: User) => void
  removeTypingUser: (roomId: string, userId: string) => void

  // Clear all
  clearAllMessages: () => void
}

const AVAILABLE_ROOMS: Room[] = [
  { id: 'sala-geral', name: '💬 Geral', messages: [], presence: [], typingUsers: [] },
  { id: 'sala-de-jogos', name: '🎮 Jogos', messages: [], presence: [], typingUsers: [] },
  { id: 'sala-tech', name: '💻 Tech', messages: [], presence: [], typingUsers: [] },
]

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: AVAILABLE_ROOMS,
  activeRoomId: 'sala-geral',

  getActiveRoom: () => {
    const { rooms, activeRoomId } = get()
    return rooms.find(r => r.id === activeRoomId) || rooms[0]
  },

  setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),

  initializeRooms: (rooms) => set({ rooms }),

  addMessage: (roomId, message) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId
        ? { ...room, messages: [...room.messages, message] }
        : room
    ),
  })),

  updateMessage: (roomId, messageId, updates) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId
        ? {
            ...room,
            messages: room.messages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          }
        : room
    ),
  })),

  setPresenceList: (roomId, users) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId ? { ...room, presence: users } : room
    ),
  })),

  addUserToPresence: (roomId, user) => set((state) => ({
    rooms: state.rooms.map(room => {
      if (room.id !== roomId) return room

      // Verifica se usuário já está na lista
      if (room.presence.some(u => u.id === user.id)) {
        return room
      }

      return { ...room, presence: [...room.presence, user] }
    }),
  })),

  removeUserFromPresence: (roomId, userId) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId
        ? { ...room, presence: room.presence.filter(u => u.id !== userId) }
        : room
    ),
  })),

  setTypingUsers: (roomId, users) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId ? { ...room, typingUsers: users } : room
    ),
  })),

  addTypingUser: (roomId, user) => set((state) => ({
    rooms: state.rooms.map(room => {
      if (room.id !== roomId) return room

      if (room.typingUsers.some(u => u.id === user.id)) {
        return room
      }

      return { ...room, typingUsers: [...room.typingUsers, user] }
    }),
  })),

  removeTypingUser: (roomId, userId) => set((state) => ({
    rooms: state.rooms.map(room =>
      room.id === roomId
        ? { ...room, typingUsers: room.typingUsers.filter(u => u.id !== userId) }
        : room
    ),
  })),

  clearAllMessages: () => set((state) => ({
    rooms: state.rooms.map(room => ({ ...room, messages: [], presence: [], typingUsers: [] })),
  })),
}))
