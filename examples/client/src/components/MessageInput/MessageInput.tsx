import { memo, FormEvent, ChangeEvent } from 'react'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isConnected: boolean
  roomName: string
}

export const MessageInput = memo(({ value, onChange, onSubmit, isConnected, roomName }: MessageInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="bg-[#F0F2F5] px-4 py-3 border-t border-gray-300">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        {/* Left action buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            title="Emojis"
          >
            😊
          </button>
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            title="Anexar"
          >
            📎
          </button>
        </div>

        {/* Input field - WhatsApp style */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={`Digite uma mensagem em ${roomName}`}
            disabled={!isConnected}
            className="w-full px-4 py-2.5 bg-white rounded-3xl border-none outline-none text-sm text-gray-800 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-400 transition-shadow"
          />
        </div>

        {/* Send button - WhatsApp style */}
        {value.trim() ? (
          <button
            type="submit"
            disabled={!isConnected}
            className="whatsapp-button"
            title="Enviar mensagem"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="p-2.5 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            title="Mensagem de voz"
          >
            🎤
          </button>
        )}
      </form>

      {/* Connection warning */}
      {!isConnected && (
        <div className="mt-2 text-xs text-center text-red-500 flex items-center justify-center gap-1">
          <span>⚠️</span>
          <span>Desconectado - aguardando conexão para enviar mensagens</span>
        </div>
      )}
    </div>
  )
})

MessageInput.displayName = 'MessageInput'
