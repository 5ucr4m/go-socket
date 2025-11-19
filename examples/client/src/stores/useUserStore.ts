import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  userId: string
  username: string
  isLoggedIn: boolean
  setUsername: (username: string) => void
  setUserId: (userId: string) => void
  login: (username: string) => void
  logout: () => void
}

// Gera ID único
const generateUserId = () => 'user-' + Math.random().toString(36).substr(2, 9)

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: '',
      username: '',
      isLoggedIn: false,

      setUsername: (username) => set({ username }),

      setUserId: (userId) => set({ userId }),

      login: (username) => {
        const userId = generateUserId()
        set({ username, userId, isLoggedIn: true })
      },

      logout: () => set({ username: '', userId: '', isLoggedIn: false }),
    }),
    {
      name: 'go-socket-user', // nome da chave no localStorage
      partialize: (state) => ({ username: state.username }), // persiste apenas username
    }
  )
)
