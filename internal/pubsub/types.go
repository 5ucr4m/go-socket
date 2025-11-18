package pubsub

// EventType representa os tipos de eventos suportados
type EventType string

const (
	EventSubscribe   EventType = "subscribe"
	EventUnsubscribe EventType = "unsubscribe"
	EventPublish     EventType = "publish"
	EventPresence    EventType = "presence"
)

// ClientEvent representa um evento recebido do cliente
type ClientEvent struct {
	Type    EventType              `json:"type"`
	Room    string                 `json:"room"`
	Payload interface{}            `json:"payload,omitempty"`
	User    map[string]interface{} `json:"user,omitempty"`
	Options *EventOptions          `json:"options,omitempty"`
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
