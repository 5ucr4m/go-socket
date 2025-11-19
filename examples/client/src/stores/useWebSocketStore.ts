import { create } from 'zustand'

interface WebSocketState {
  isConnected: boolean
  isReconnecting: boolean
  reconnectAttempts: number

  setConnected: (connected: boolean) => void
  setReconnecting: (reconnecting: boolean) => void
  setReconnectAttempts: (attempts: number) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  isReconnecting: false,
  reconnectAttempts: 0,

  setConnected: (connected) => set({ isConnected: connected }),

  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),

  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),

  incrementReconnectAttempts: () => set((state) => ({
    reconnectAttempts: state.reconnectAttempts + 1
  })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}))
