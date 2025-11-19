package pubsub

// EventType representa os tipos de eventos suportados
type EventType string

const (
	EventSubscribe   EventType = "subscribe"
	EventUnsubscribe EventType = "unsubscribe"
	EventPublish     EventType = "publish"
	EventPresence    EventType = "presence"
	EventTyping      EventType = "typing"       // Indicador de digitação
	EventReadReceipt EventType = "read_receipt" // Confirmação de leitura
	EventDirectMsg   EventType = "direct_msg"   // Mensagem direta
	EventEditMessage EventType = "edit_message" // Edição de mensagem
)

// ClientEvent representa um evento recebido do cliente
type ClientEvent struct {
	Type      EventType              `json:"type"`
	Room      string                 `json:"room,omitempty"`
	Payload   interface{}            `json:"payload,omitempty"`
	User      map[string]interface{} `json:"user,omitempty"`
	Options   *EventOptions          `json:"options,omitempty"`
	ToUserID  string                 `json:"toUserId,omitempty"`  // Para mensagens diretas
	MessageID string                 `json:"messageId,omitempty"` // Para read receipts
	IsTyping  bool                   `json:"isTyping,omitempty"`  // Para typing indicators
}

// EventOptions contém opções para eventos
type EventOptions struct {
	History bool `json:"history,omitempty"`
	Limit   int  `json:"limit,omitempty"`
}

// SubscribeOptions contém opções para subscribe
type SubscribeOptions struct {
	History bool
	Limit   int
}

// PayloadMessage representa a estrutura do payload de uma mensagem
type PayloadMessage struct {
	Message interface{} `json:"message"`
	Type    string      `json:"type"` // "text", "image", "file", etc
}
