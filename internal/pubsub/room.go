package pubsub

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// Room representa uma sala de chat individual
// Gerencia clientes subscritos, histórico de mensagens e presença
type Room struct {
	// Nome único da sala
	name string

	// Mutex para operações thread-safe
	mu sync.RWMutex

	// Clientes subscritos na sala (recebem mensagens)
	subscribers map[*Client]bool

	// Clientes com presence ativo (recebem eventos de entrada/saída)
	presenceClients map[*Client]bool

	// Histórico de mensagens da sala
	messageHistory []*RoomMessage

	// Limite máximo de mensagens no histórico (0 = ilimitado)
	maxHistorySize int

	// Metadata da sala
	metadata map[string]interface{}

	// Data de criação da sala
	createdAt time.Time
}

// RoomMessage representa uma mensagem armazenada no histórico da sala
type RoomMessage struct {
	ID        string                 `json:"id"`               // ID único da mensagem
	Payload   interface{}            `json:"payload"`
	User      map[string]interface{} `json:"user"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt time.Time              `json:"createdAt"`        // Timestamp de criação original
	EditedAt  *time.Time             `json:"editedAt,omitempty"` // Timestamp da última edição (se houver)
	IsEdited  bool                   `json:"isEdited"`         // Flag indicando se foi editada
}

// NewRoom cria uma nova sala
func NewRoom(name string, maxHistorySize int) *Room {
	return &Room{
		name:            name,
		subscribers:     make(map[*Client]bool),
		presenceClients: make(map[*Client]bool),
		messageHistory:  make([]*RoomMessage, 0),
		maxHistorySize:  maxHistorySize,
		metadata: map[string]interface{}{
			"room": name,
		},
		createdAt: time.Now(),
	}
}

// Subscribe adiciona um cliente à sala
func (r *Room) Subscribe(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.subscribers[client] = true
}

// Unsubscribe remove um cliente da sala
func (r *Room) Unsubscribe(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.subscribers, client)
}

// AddPresence adiciona um cliente ao tracking de presença
func (r *Room) AddPresence(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.presenceClients[client] = true
}

// RemovePresence remove um cliente do tracking de presença
func (r *Room) RemovePresence(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.presenceClients, client)
}

// generateMessageID gera um ID único para uma mensagem
func generateMessageID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// AddMessage adiciona uma mensagem ao histórico
// Implementa um buffer circular se maxHistorySize > 0
func (r *Room) AddMessage(msg *RoomMessage) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Gera ID único se não existir
	if msg.ID == "" {
		msg.ID = generateMessageID()
	}

	// Define timestamp de criação se não existir
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now()
	}

	// Adiciona metadata
	if msg.Metadata == nil {
		msg.Metadata = make(map[string]interface{})
	}
	msg.Metadata["room"] = r.name
	msg.Metadata["createdAt"] = msg.CreatedAt

	r.messageHistory = append(r.messageHistory, msg)

	// Mantém apenas as últimas maxHistorySize mensagens
	if r.maxHistorySize > 0 && len(r.messageHistory) > r.maxHistorySize {
		// Remove mensagens antigas (buffer circular)
		r.messageHistory = r.messageHistory[len(r.messageHistory)-r.maxHistorySize:]
	}
}

// EditMessage edita uma mensagem existente no histórico
// Retorna true se a mensagem foi encontrada e editada, false caso contrário
func (r *Room) EditMessage(messageID string, newPayload interface{}) (*RoomMessage, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Procura a mensagem no histórico
	for i, msg := range r.messageHistory {
		if msg.ID == messageID {
			// Atualiza o payload
			msg.Payload = newPayload

			// Marca como editada
			now := time.Now()
			msg.EditedAt = &now
			msg.IsEdited = true

			// Atualiza metadata
			if msg.Metadata == nil {
				msg.Metadata = make(map[string]interface{})
			}
			msg.Metadata["editedAt"] = now
			msg.Metadata["isEdited"] = true

			// Atualiza no histórico
			r.messageHistory[i] = msg

			return msg, true
		}
	}

	return nil, false
}

// GetHistory retorna o histórico de mensagens com limite opcional
func (r *Room) GetHistory(limit int) []*RoomMessage {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if limit <= 0 || limit >= len(r.messageHistory) {
		// Retorna todo o histórico
		result := make([]*RoomMessage, len(r.messageHistory))
		copy(result, r.messageHistory)
		return result
	}

	// Retorna apenas as últimas 'limit' mensagens
	start := len(r.messageHistory) - limit
	result := make([]*RoomMessage, limit)
	copy(result, r.messageHistory[start:])
	return result
}

// GetSubscribers retorna lista de clientes subscritos (thread-safe)
func (r *Room) GetSubscribers() []*Client {
	r.mu.RLock()
	defer r.mu.RUnlock()

	clients := make([]*Client, 0, len(r.subscribers))
	for client := range r.subscribers {
		clients = append(clients, client)
	}
	return clients
}

// GetPresenceClients retorna lista de clientes com presence (thread-safe)
func (r *Room) GetPresenceClients() []*Client {
	r.mu.RLock()
	defer r.mu.RUnlock()

	clients := make([]*Client, 0, len(r.presenceClients))
	for client := range r.presenceClients {
		clients = append(clients, client)
	}
	return clients
}

// GetPresenceList retorna informações de todos os usuários presentes
func (r *Room) GetPresenceList() []map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	presence := make([]map[string]interface{}, 0)

	// Combina subscribers e presenceClients para pegar todos os usuários
	allClients := make(map[*Client]bool)
	for client := range r.subscribers {
		allClients[client] = true
	}
	for client := range r.presenceClients {
		allClients[client] = true
	}

	for client := range allClients {
		if client.userInfo != nil {
			presence = append(presence, client.userInfo)
		}
	}

	return presence
}

// IsEmpty verifica se a sala está vazia
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.subscribers) == 0 && len(r.presenceClients) == 0
}

// GetMetadata retorna os metadados da sala
func (r *Room) GetMetadata() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	meta := make(map[string]interface{})
	for k, v := range r.metadata {
		meta[k] = v
	}
	meta["createdAt"] = r.createdAt
	meta["subscriberCount"] = len(r.subscribers)
	meta["presenceCount"] = len(r.presenceClients)

	return meta
}
