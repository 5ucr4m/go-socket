package pubsub

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 8192 // Aumentado para suportar mensagens maiores
)

// Client representa um cliente WebSocket conectado
type Client struct {
	// Hub que gerencia este cliente
	hub *Hub

	// Conexão WebSocket
	conn *websocket.Conn

	// Canal para enviar mensagens ao cliente
	send chan []byte

	// Informações do usuário
	userInfo map[string]interface{}

	// Salas às quais o cliente está subscrito
	roomSubscriptions map[string]bool

	// Salas com presence tracking ativo
	presenceRooms map[string]bool

	// Mutex para operações thread-safe
	mu sync.RWMutex
}

// NewClient cria uma nova instância de Client
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:               hub,
		conn:              conn,
		send:              make(chan []byte, 256),
		userInfo:          make(map[string]interface{}),
		roomSubscriptions: make(map[string]bool),
		presenceRooms:     make(map[string]bool),
	}
}

// SetUserInfo define as informações do usuário
func (c *Client) SetUserInfo(userInfo map[string]interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.userInfo = userInfo
}

// GetUserInfo retorna as informações do usuário
func (c *Client) GetUserInfo() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.userInfo
}

// GetUserID retorna o ID do usuário
func (c *Client) GetUserID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if id, ok := c.userInfo["id"].(string); ok {
		return id
	}
	return ""
}

// ReadPump lê mensagens do WebSocket e as envia para o hub (método público)
func (c *Client) ReadPump() {
	c.readPump()
}

// WritePump envia mensagens do hub para o cliente WebSocket (método público)
func (c *Client) WritePump() {
	c.writePump()
}

// readPump lê mensagens do WebSocket e as envia para o hub
// Roda em uma goroutine dedicada por conexão
func (c *Client) readPump() {
	defer func() {
		// Remove cliente de todas as salas antes de desregistrar
		if c.hub.roomManager != nil {
			c.hub.roomManager.RemoveClientFromAllRooms(c)
		}
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, rawMessage, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("erro: %v", err)
			}
			break
		}

		log.Printf("Mensagem recebida: %s", rawMessage)

		// Tenta desserializar como evento de sala
		var event ClientEvent
		if err := json.Unmarshal(rawMessage, &event); err != nil {
			log.Printf("Erro ao desserializar evento: %v", err)
			continue
		}

		// Atualiza userInfo se fornecido no evento
		if event.User != nil && len(event.User) > 0 {
			c.SetUserInfo(event.User)
		}

		// Processa o evento
		c.handleEvent(&event)
	}
}

// handleEvent processa eventos recebidos do cliente
func (c *Client) handleEvent(event *ClientEvent) {
	if c.hub.roomManager == nil {
		log.Printf("RoomManager não disponível")
		return
	}

	switch event.Type {
	case EventSubscribe:
		options := SubscribeOptions{}
		if event.Options != nil {
			options.History = event.Options.History
			options.Limit = event.Options.Limit
		}
		c.hub.roomManager.Subscribe(c, event.Room, options)

	case EventUnsubscribe:
		c.hub.roomManager.Unsubscribe(c, event.Room)

	case EventPublish:
		// Cria payload estruturado
		payload := event.Payload

		// Se o payload for um map, verifica se tem message e type
		if payloadMap, ok := event.Payload.(map[string]interface{}); ok {
			if _, hasMessage := payloadMap["message"]; !hasMessage {
				// Se não tem message, assume que o payload todo é a mensagem
				payload = PayloadMessage{
					Message: event.Payload,
					Type:    "text", // default
				}
			}
		} else {
			// Se não for um map, envelopa como PayloadMessage
			payload = PayloadMessage{
				Message: event.Payload,
				Type:    "text",
			}
		}

		c.hub.roomManager.Publish(c, event.Room, payload)

	case EventPresence:
		c.hub.roomManager.AddPresence(c, event.Room)

	case EventTyping:
		// Broadcast typing indicator para todos na sala
		c.hub.roomManager.BroadcastTyping(c, event.Room, event.IsTyping)

	case EventReadReceipt:
		// Envia confirmação de leitura para o remetente
		c.hub.roomManager.SendReadReceipt(c, event.Room, event.MessageID)

	case EventDirectMsg:
		// Envia mensagem direta para usuário específico
		c.hub.roomManager.SendDirectMessage(c, event.ToUserID, event.Payload)

	case EventEditMessage:
		// Edita uma mensagem existente
		c.hub.roomManager.EditMessage(c, event.Room, event.MessageID, event.Payload)

	default:
		log.Printf("Tipo de evento desconhecido: %s", event.Type)
	}
}

// writePump envia mensagens do hub para o cliente WebSocket
// Roda em uma goroutine dedicada por conexão
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// O hub fechou o canal
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Adiciona mensagens enfileiradas ao frame atual
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
