package pubsub

import (
	"log"
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
	maxMessageSize = 512
)

// Client representa um cliente WebSocket conectado
type Client struct {
	// Hub que gerencia este cliente
	hub *Hub

	// Conexão WebSocket
	conn *websocket.Conn

	// Canal para enviar mensagens ao cliente
	send chan []byte
}

// NewClient cria uma nova instância de Client
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
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

		// Desserializa a mensagem JSON
		message, err := FromJSON(rawMessage)
		if err != nil {
			log.Printf("Erro ao desserializar mensagem: %v", err)
			continue
		}

		// Envia mensagem para o hub fazer broadcast
		c.hub.broadcast <- message
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
