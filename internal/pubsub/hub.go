package pubsub

import (
	"encoding/json"
	"log"

	redisAdapter "github.com/5ucr4m/go-socket/internal/redis"
)

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

	// Gerenciador de salas
	roomManager *RoomManager

	// Redis Pub/Sub para sincronização entre instâncias
	pubSubAdapter *redisAdapter.PubSubAdapter

	// Redis Streams para persistência
	streamProducer *redisAdapter.StreamProducer
}

// NewHub cria uma nova instância do Hub
func NewHub() *Hub {
	return &Hub{
		broadcast:   make(chan *Message),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[*Client]bool),
		roomManager: NewRoomManager(1000), // Histórico padrão de 1000 mensagens
	}
}

// NewHubWithRedis cria um Hub com suporte a Redis
func NewHubWithRedis(redisURL, instanceID string) (*Hub, error) {
	hub := NewHub()

	// Inicializa Redis Pub/Sub
	pubSubAdapter, err := redisAdapter.NewPubSubAdapter(redisURL, instanceID)
	if err != nil {
		return nil, err
	}
	hub.pubSubAdapter = pubSubAdapter

	// Inicializa Redis Streams
	streamProducer, err := redisAdapter.NewStreamProducer(redisURL)
	if err != nil {
		return nil, err
	}
	hub.streamProducer = streamProducer

	// Se inscreve no canal de broadcast
	err = pubSubAdapter.Subscribe(func(payload []byte) error {
		// Broadcast local para clientes conectados nesta instância
		log.Printf("[Hub] Mensagem recebida do Redis Pub/Sub, broadcasting para %d clientes locais", len(hub.clients))
		hub.broadcastToLocalClients(payload)
		return nil
	})
	if err != nil {
		return nil, err
	}

	log.Printf("[Hub] Hub inicializado com Redis (instance: %s)", instanceID)
	return hub, nil
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

			log.Printf("Broadcasting para %d clientes locais: %s", len(h.clients), jsonData)

			// 1. Broadcast local para clientes conectados nesta instância
			h.broadcastToLocalClients(jsonData)

			// 2. Publica no Redis Pub/Sub para outras instâncias
			if h.pubSubAdapter != nil {
				if err := h.pubSubAdapter.Publish(jsonData); err != nil {
					log.Printf("Erro ao publicar no Redis Pub/Sub: %v", err)
				}
			}

			// 3. Enfileira no Redis Streams para persistência
			if h.streamProducer != nil {
				// Extrai informações para persistência
				streamMsg := h.messageToStreamMessage(message)
				if streamMsg != nil {
					if err := h.streamProducer.Publish(streamMsg); err != nil {
						log.Printf("Erro ao publicar no Redis Streams: %v", err)
					}
				}
			}
		}
	}
}

// broadcastToLocalClients envia mensagem para clientes locais desta instância
func (h *Hub) broadcastToLocalClients(jsonData []byte) {
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

// messageToStreamMessage converte Message para StreamMessage
func (h *Hub) messageToStreamMessage(msg *Message) *redisAdapter.StreamMessage {
	streamMsg := &redisAdapter.StreamMessage{
		RoomName: "default",
		Payload:  make(map[string]interface{}),
		Metadata: make(map[string]interface{}),
	}

	// Deserializa payload se disponível
	if len(msg.Payload) > 0 {
		var payloadMap map[string]interface{}
		if err := json.Unmarshal(msg.Payload, &payloadMap); err == nil {
			streamMsg.Payload = payloadMap

			// Tenta extrair room do payload
			if room, ok := payloadMap["room"].(string); ok && room != "" {
				streamMsg.RoomName = room
			}
		}
	}

	// Deserializa user info se disponível
	if len(msg.User) > 0 {
		var userMap map[string]interface{}
		if err := json.Unmarshal(msg.User, &userMap); err == nil {
			if id, ok := userMap["id"].(string); ok {
				streamMsg.UserID = id
			}
			if username, ok := userMap["username"].(string); ok {
				streamMsg.Username = username
			}
		}
	}

	// Deserializa metadata se disponível
	if len(msg.Metadata) > 0 {
		var metadataMap map[string]interface{}
		if err := json.Unmarshal(msg.Metadata, &metadataMap); err == nil {
			streamMsg.Metadata = metadataMap
		}
	}

	return streamMsg
}

// Close fecha as conexões do Hub
func (h *Hub) Close() error {
	if h.pubSubAdapter != nil {
		if err := h.pubSubAdapter.Close(); err != nil {
			log.Printf("Erro ao fechar Redis Pub/Sub: %v", err)
		}
	}

	if h.streamProducer != nil {
		if err := h.streamProducer.Close(); err != nil {
			log.Printf("Erro ao fechar Redis Streams: %v", err)
		}
	}

	return nil
}
