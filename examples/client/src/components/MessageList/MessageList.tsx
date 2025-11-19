import { memo, useEffect, useRef } from 'react'
import { Message } from '../../models'
import { MessageItem } from './MessageItem'

interface MessageListProps {
  messages: Message[]
  onEditMessage: (messageId: string, newText: string) => void
}

export const MessageList = memo(({ messages, onEditMessage }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
          <p className="text-sm mt-2">Seja o primeiro a enviar uma mensagem!</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onEdit={onEditMessage}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
})

MessageList.displayName = 'MessageList'
