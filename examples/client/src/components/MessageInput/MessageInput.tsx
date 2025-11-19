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
    <form onSubmit={onSubmit} className="p-4 border-t border-gray-200">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={`Mensagem em ${roomName}...`}
          disabled={!isConnected}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!isConnected || !value.trim()}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          Enviar
        </button>
      </div>
    </form>
  )
})

MessageInput.displayName = 'MessageInput'
