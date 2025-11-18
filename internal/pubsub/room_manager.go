package pubsub

import (
	"encoding/json"
	"log"
	"sync"
)

// RoomManager gerencia todas as salas de chat
type RoomManager struct {
	// Mutex para operações thread-safe
	mu sync.RWMutex

	// Mapa de salas (nome -> sala)
	rooms map[string]*Room

	// Limite padrão de histórico para novas salas
	defaultMaxHistory int
}

// NewRoomManager cria um novo gerenciador de salas
func NewRoomManager(defaultMaxHistory int) *RoomManager {
	return &RoomManager{
		rooms:             make(map[string]*Room),
		defaultMaxHistory: defaultMaxHistory,
	}
}

// GetOrCreateRoom obtém uma sala existente ou cria uma nova
func (rm *RoomManager) GetOrCreateRoom(name string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, exists := rm.rooms[name]; exists {
		return room
	}

	// Cria nova sala com limite padrão
	room := NewRoom(name, rm.defaultMaxHistory)
	rm.rooms[name] = room
	log.Printf("Sala criada: %s", name)
	return room
}

// GetRoom obtém uma sala existente (retorna nil se não existir)
func (rm *RoomManager) GetRoom(name string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.rooms[name]
}

// RemoveRoom remove uma sala (geralmente quando está vazia)
func (rm *RoomManager) RemoveRoom(name string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, exists := rm.rooms[name]; exists {
		if room.IsEmpty() {
			delete(rm.rooms, name)
			log.Printf("Sala removida: %s", name)
		}
	}
}

// CleanupEmptyRooms remove todas as salas vazias
func (rm *RoomManager) CleanupEmptyRooms() {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	for name, room := range rm.rooms {
		if room.IsEmpty() {
			delete(rm.rooms, name)
			log.Printf("Sala vazia removida: %s", name)
		}
	}
}

// Subscribe inscreve um cliente em uma sala
func (rm *RoomManager) Subscribe(client *Client, roomName string, options SubscribeOptions) error {
	room := rm.GetOrCreateRoom(roomName)
	room.Subscribe(client)

	// Registra a sala no cliente
	client.mu.Lock()
	client.roomSubscriptions[roomName] = true
	client.mu.Unlock()

	log.Printf("Cliente %p subscrito na sala: %s", client, roomName)

	// Envia histórico se solicitado
	if options.History {
		history := room.GetHistory(options.Limit)
		if len(history) > 0 {
			rm.sendHistoryToClient(client, roomName, history)
		}
	}

	return nil
}

// Unsubscribe remove um cliente de uma sala
func (rm *RoomManager) Unsubscribe(client *Client, roomName string) {
	room := rm.GetRoom(roomName)
	if room == nil {
		return
	}

	room.Unsubscribe(client)

	// Remove do cliente
	client.mu.Lock()
	delete(client.roomSubscriptions, roomName)
	client.mu.Unlock()

	log.Printf("Cliente %p removido da sala: %s", client, roomName)

	// Remove sala se estiver vazia
	if room.IsEmpty() {
		rm.RemoveRoom(roomName)
	}
}

// Publish publica uma mensagem em uma sala
func (rm *RoomManager) Publish(client *Client, roomName string, payload interface{}) error {
	room := rm.GetRoom(roomName)
	if room == nil {
		log.Printf("Tentativa de publicar em sala inexistente: %s", roomName)
		return nil
	}

	// Cria mensagem
	roomMsg := &RoomMessage{
		Payload:  payload,
		User:     client.userInfo,
		Metadata: room.GetMetadata(),
	}

	// Adiciona ao histórico
	room.AddMessage(roomMsg)

	// Envia para todos os subscribers
	subscribers := room.GetSubscribers()
	rm.broadcastToClients(subscribers, roomMsg)

	log.Printf("Mensagem publicada na sala %s para %d clientes", roomName, len(subscribers))

	return nil
}

// AddPresence adiciona presence tracking para um cliente em uma sala
func (rm *RoomManager) AddPresence(client *Client, roomName string) error {
	room := rm.GetOrCreateRoom(roomName)
	room.AddPresence(client)

	// Registra no cliente
	client.mu.Lock()
	client.presenceRooms[roomName] = true
	client.mu.Unlock()

	log.Printf("Cliente %p adicionado ao presence da sala: %s", client, roomName)

	// Envia lista atual de presença para o cliente
	presenceList := room.GetPresenceList()
	rm.sendPresenceListToClient(client, roomName, presenceList)

	// Notifica outros clientes sobre a entrada
	rm.notifyPresenceEvent(room, "user_joined", client.userInfo)

	return nil
}

// RemovePresence remove presence tracking de um cliente em uma sala
func (rm *RoomManager) RemovePresence(client *Client, roomName string) {
	room := rm.GetRoom(roomName)
	if room == nil {
		return
	}

	room.RemovePresence(client)

	// Remove do cliente
	client.mu.Lock()
	delete(client.presenceRooms, roomName)
	client.mu.Unlock()

	log.Printf("Cliente %p removido do presence da sala: %s", client, roomName)

	// Notifica outros clientes sobre a saída
	rm.notifyPresenceEvent(room, "user_left", client.userInfo)

	// Remove sala se estiver vazia
	if room.IsEmpty() {
		rm.RemoveRoom(roomName)
	}
}

// RemoveClientFromAllRooms remove um cliente de todas as salas
func (rm *RoomManager) RemoveClientFromAllRooms(client *Client) {
	client.mu.RLock()
	subscriptions := make([]string, 0, len(client.roomSubscriptions))
	for roomName := range client.roomSubscriptions {
		subscriptions = append(subscriptions, roomName)
	}
	presenceRooms := make([]string, 0, len(client.presenceRooms))
	for roomName := range client.presenceRooms {
		presenceRooms = append(presenceRooms, roomName)
	}
	client.mu.RUnlock()

	// Remove de subscriptions
	for _, roomName := range subscriptions {
		rm.Unsubscribe(client, roomName)
	}

	// Remove de presence
	for _, roomName := range presenceRooms {
		rm.RemovePresence(client, roomName)
	}
}

// sendHistoryToClient envia histórico de mensagens para um cliente
func (rm *RoomManager) sendHistoryToClient(client *Client, roomName string, history []*RoomMessage) {
	for _, msg := range history {
		data, err := json.Marshal(map[string]interface{}{
			"type":    "history",
			"room":    roomName,
			"payload": msg.Payload,
			"user":    msg.User,
			"metadata": msg.Metadata,
		})
		if err != nil {
			log.Printf("Erro ao serializar histórico: %v", err)
			continue
		}

		select {
		case client.send <- data:
		default:
			log.Printf("Cliente %p não pode receber histórico", client)
		}
	}
}

// sendPresenceListToClient envia lista de presença para um cliente
func (rm *RoomManager) sendPresenceListToClient(client *Client, roomName string, presenceList []map[string]interface{}) {
	data, err := json.Marshal(map[string]interface{}{
		"type":         "presence_list",
		"room":         roomName,
		"presenceList": presenceList,
	})
	if err != nil {
		log.Printf("Erro ao serializar presence list: %v", err)
		return
	}

	select {
	case client.send <- data:
	default:
		log.Printf("Cliente %p não pode receber presence list", client)
	}
}

// notifyPresenceEvent notifica evento de presença para todos os clientes
func (rm *RoomManager) notifyPresenceEvent(room *Room, eventType string, userInfo map[string]interface{}) {
	presenceClients := room.GetPresenceClients()

	data, err := json.Marshal(map[string]interface{}{
		"type":  eventType,
		"room":  room.name,
		"user":  userInfo,
	})
	if err != nil {
		log.Printf("Erro ao serializar presence event: %v", err)
		return
	}

	for _, client := range presenceClients {
		// Não notifica o próprio cliente sobre sua entrada
		if eventType == "user_joined" && client.userInfo != nil {
			if userID, ok := userInfo["id"]; ok {
				if clientID, ok := client.userInfo["id"]; ok && userID == clientID {
					continue
				}
			}
		}

		select {
		case client.send <- data:
		default:
			log.Printf("Cliente %p não pode receber presence event", client)
		}
	}
}

// broadcastToClients envia mensagem para uma lista de clientes
func (rm *RoomManager) broadcastToClients(clients []*Client, msg *RoomMessage) {
	data, err := json.Marshal(map[string]interface{}{
		"type":     "message",
		"payload":  msg.Payload,
		"user":     msg.User,
		"metadata": msg.Metadata,
	})
	if err != nil {
		log.Printf("Erro ao serializar mensagem: %v", err)
		return
	}

	for _, client := range clients {
		select {
		case client.send <- data:
		default:
			log.Printf("Cliente %p não pode receber mensagem", client)
		}
	}
}

// GetRoomStats retorna estatísticas de uma sala
func (rm *RoomManager) GetRoomStats(roomName string) map[string]interface{} {
	room := rm.GetRoom(roomName)
	if room == nil {
		return nil
	}

	return room.GetMetadata()
}
