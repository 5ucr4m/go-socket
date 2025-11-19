import { memo, useState, KeyboardEvent } from 'react'
import { Message } from '../../models'

interface MessageItemProps {
  message: Message
  onEdit: (messageId: string, newText: string) => void
}

export const MessageItem = memo(({ message, onEdit }: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.text)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newText = editText.trim()
      if (newText && newText !== message.text) {
        onEdit(message.id, newText)
      }
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setEditText(message.text)
      setIsEditing(false)
    }
  }

  // Mensagem de sistema
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
          {message.text}
        </div>
      </div>
    )
  }

  // Mensagem normal
  return (
    <div className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
      <div className="flex flex-col gap-1 max-w-xs md:max-w-md">
        <div
          className={`px-4 py-2 rounded-lg ${
            message.type === 'sent'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          {message.type === 'received' && (
            <p className="text-xs font-semibold mb-1 opacity-70">
              {message.username}
            </p>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-white text-gray-800 px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setEditText(message.text)
                    setIsEditing(false)
                  }}
                  className="text-red-300 hover:text-red-100"
                >
                  Cancelar (Esc)
                </button>
                <span className="opacity-50">Enter para salvar</span>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words">{message.text}</p>
          )}

          <p className="text-xs opacity-70 mt-1 flex items-center gap-2">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            {message.isEdited && (
              <span className="text-xs italic">(editada)</span>
            )}
            {message.isHistory && (
              <span className="text-xs bg-black bg-opacity-20 px-2 py-0.5 rounded">
                histórico
              </span>
            )}
            {message.type === 'sent' && message.readBy && message.readBy.length > 0 && (
              <span className="text-xs">✓✓</span>
            )}
          </p>
        </div>

        {message.type === 'sent' && !message.isHistory && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-500 hover:text-gray-700 self-end"
            title="Editar mensagem"
          >
            ✏️ Editar
          </button>
        )}
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'
