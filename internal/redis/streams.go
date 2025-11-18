package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

const (
	// Stream para persistência de mensagens
	MessagesStream = "gosocket:messages:stream"

	// Consumer group para workers
	PersistConsumerGroup = "persist-workers"
)

// StreamMessage representa uma mensagem a ser persistida
type StreamMessage struct {
	RoomName string                 `json:"room_name"`
	UserID   string                 `json:"user_id,omitempty"`
	Username string                 `json:"username,omitempty"`
	Payload  map[string]interface{} `json:"payload"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// StreamProducer publica mensagens no Redis Stream
type StreamProducer struct {
	client *redis.Client
	ctx    context.Context
}

// NewStreamProducer cria um novo produtor de streams
func NewStreamProducer(redisURL string) (*StreamProducer, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Testa a conexão
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("falha ao conectar no Redis: %w", err)
	}

	producer := &StreamProducer{
		client: client,
		ctx:    ctx,
	}

	// Garante que o consumer group existe
	if err := producer.ensureConsumerGroup(); err != nil {
		log.Printf("[Redis Streams] Aviso ao criar consumer group: %v", err)
	}

	log.Printf("[Redis Streams] Producer conectado ao Redis em %s", redisURL)

	return producer, nil
}

// ensureConsumerGroup garante que o consumer group existe
func (sp *StreamProducer) ensureConsumerGroup() error {
	// Cria o stream se não existir (com uma entrada dummy que será deletada)
	err := sp.client.XGroupCreateMkStream(sp.ctx, MessagesStream, PersistConsumerGroup, "0").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("erro ao criar consumer group: %w", err)
	}

	log.Printf("[Redis Streams] Consumer group '%s' garantido", PersistConsumerGroup)
	return nil
}

// Publish adiciona uma mensagem ao stream
func (sp *StreamProducer) Publish(msg *StreamMessage) error {
	// Serializa payload e metadata para JSON
	payloadJSON, err := json.Marshal(msg.Payload)
	if err != nil {
		return fmt.Errorf("erro ao serializar payload: %w", err)
	}

	metadataJSON, err := json.Marshal(msg.Metadata)
	if err != nil {
		return fmt.Errorf("erro ao serializar metadata: %w", err)
	}

	// Adiciona ao stream
	values := map[string]interface{}{
		"room_name": msg.RoomName,
		"user_id":   msg.UserID,
		"username":  msg.Username,
		"payload":   string(payloadJSON),
		"metadata":  string(metadataJSON),
	}

	id, err := sp.client.XAdd(sp.ctx, &redis.XAddArgs{
		Stream: MessagesStream,
		Values: values,
	}).Result()

	if err != nil {
		return fmt.Errorf("erro ao adicionar ao stream: %w", err)
	}

	log.Printf("[Redis Streams] Mensagem adicionada ao stream: %s (room: %s)", id, msg.RoomName)
	return nil
}

// Close fecha a conexão com o Redis
func (sp *StreamProducer) Close() error {
	if err := sp.client.Close(); err != nil {
		return fmt.Errorf("erro ao fechar cliente Redis: %w", err)
	}
	log.Println("[Redis Streams] Producer fechado")
	return nil
}

// GetStreamInfo retorna informações sobre o stream
func (sp *StreamProducer) GetStreamInfo() (int64, error) {
	info, err := sp.client.XLen(sp.ctx, MessagesStream).Result()
	if err != nil {
		return 0, fmt.Errorf("erro ao obter info do stream: %w", err)
	}
	return info, nil
}
