import { memo, useState, KeyboardEvent } from 'react'
import { Message } from '../../models'

interface MessageItemProps {
  message: Message
  onEdit: (messageId: string, newText: string) => void
  onDelete?: (messageId: string) => void
}

export const MessageItem = memo(({ message, onEdit, onDelete }: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.text)
  const [showActions, setShowActions] = useState(false)

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
      <div className="flex justify-center my-2">
        <div className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm">
          {message.text}
        </div>
      </div>
    )
  }

  // Mensagem deletada - WhatsApp style
  if (message.isDeleted) {
    return (
      <div className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`px-3 py-2 rounded-lg max-w-xs md:max-w-md ${
            message.type === 'sent'
              ? 'bg-purple-100 text-purple-400'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          <p className="text-sm italic flex items-center gap-2">
            <span>🚫</span>
            <span>Esta mensagem foi apagada</span>
          </p>
          <p className="text-xs mt-1 opacity-60">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    )
  }

  // Mensagem normal - WhatsApp style
  return (
    <div className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'} group`}>
      <div
        className="relative flex flex-col max-w-xs md:max-w-md"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Bubble tail - WhatsApp style */}
        <div
          className={`px-3 py-2 rounded-lg shadow-sm relative ${
            message.type === 'sent'
              ? 'bg-purple-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
          }`}
        >
          {/* Nome do remetente para mensagens recebidas */}
          {message.type === 'received' && (
            <p className="text-xs font-semibold mb-1 text-purple-600">
              {message.username}
            </p>
          )}

          {/* Modo de edição */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-white text-gray-800 px-2 py-1 rounded text-sm border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setEditText(message.text)
                    setIsEditing(false)
                  }}
                  className={`${
                    message.type === 'sent' ? 'text-purple-200 hover:text-white' : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  Cancelar (Esc)
                </button>
                <span className="opacity-50">Enter para salvar</span>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
          )}

          {/* Timestamp e indicadores */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <p className={`text-xs ${message.type === 'sent' ? 'text-purple-100' : 'text-gray-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>

            {message.isEdited && (
              <span className={`text-xs italic ${message.type === 'sent' ? 'text-purple-200' : 'text-gray-500'}`}>
                (editada)
              </span>
            )}

            {message.isHistory && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                message.type === 'sent'
                  ? 'bg-purple-700 text-purple-100'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                histórico
              </span>
            )}

            {/* Read receipts - WhatsApp style double check */}
            {message.type === 'sent' && message.readBy && message.readBy.length > 0 && (
              <span className="text-xs text-blue-300">✓✓</span>
            )}
          </div>
        </div>

        {/* Action buttons - show on hover */}
        {message.type === 'sent' && !message.isHistory && !isEditing && showActions && (
          <div className="absolute -bottom-6 right-0 flex gap-2 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 z-10">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
              title="Editar mensagem"
            >
              ✏️ Editar
            </button>
            {onDelete && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => onDelete(message.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  title="Apagar mensagem"
                >
                  🗑️ Apagar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'
