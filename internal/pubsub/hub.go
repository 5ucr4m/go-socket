package pubsub

import "log"

// Hub mantém o conjunto de clientes ativos e faz broadcast de mensagens
type Hub struct {
	// Clientes registrados
	clients map[*Client]bool

	// Mensagens de broadcast para todos os clientes
	broadcast chan *Message

	// Registrar novos clientes
	register chan *Client

	// Remover clientes desconectados
	unregister chan *Client
}

// NewHub cria uma nova instância do Hub
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan *Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// Register adiciona um novo cliente ao hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Run inicia o loop principal do Hub
// Deve ser executado em uma goroutine
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Cliente conectado. Total: %d", len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Cliente desconectado. Total: %d", len(h.clients))
			}

		case message := <-h.broadcast:
			// Serializa a mensagem para JSON
			jsonData, err := message.ToJSON()
			if err != nil {
				log.Printf("Erro ao serializar mensagem: %v", err)
				continue
			}

			log.Printf("Broadcasting para %d clientes: %s", len(h.clients), jsonData)
			for client := range h.clients {
				select {
				case client.send <- jsonData:
				default:
					// Cliente não consegue receber, remover
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
