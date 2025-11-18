package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// MessageProcessor processa uma mensagem do stream
type MessageProcessor interface {
	ProcessBatch(messages []*StreamMessage) error
}

// StreamConsumer consome mensagens do Redis Stream usando Consumer Groups
type StreamConsumer struct {
	client       *redis.Client
	ctx          context.Context
	cancel       context.CancelFunc
	consumerID   string
	batchSize    int64
	batchTimeout time.Duration
	processor    MessageProcessor
}

// ConsumerConfig configurações do consumer
type ConsumerConfig struct {
	RedisURL     string
	ConsumerID   string
	BatchSize    int64
	BatchTimeout time.Duration
}

// NewStreamConsumer cria um novo consumidor de streams
func NewStreamConsumer(config ConsumerConfig, processor MessageProcessor) (*StreamConsumer, error) {
	client := redis.NewClient(&redis.Options{
		Addr: config.RedisURL,
	})

	// Testa a conexão
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("falha ao conectar no Redis: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	consumer := &StreamConsumer{
		client:       client,
		ctx:          ctx,
		cancel:       cancel,
		consumerID:   config.ConsumerID,
		batchSize:    config.BatchSize,
		batchTimeout: config.BatchTimeout,
		processor:    processor,
	}

	log.Printf("[Redis Consumer] Consumidor '%s' conectado ao Redis", config.ConsumerID)

	return consumer, nil
}

// Start inicia o consumo de mensagens
func (sc *StreamConsumer) Start() error {
	log.Printf("[Redis Consumer] Iniciando consumo do stream '%s' com consumer group '%s'",
		MessagesStream, PersistConsumerGroup)

	// Goroutine para processar mensagens
	go sc.consumeLoop()

	return nil
}

// consumeLoop loop principal de consumo
func (sc *StreamConsumer) consumeLoop() {
	ticker := time.NewTicker(sc.batchTimeout)
	defer ticker.Stop()

	batch := make([]*StreamMessage, 0, sc.batchSize)
	messageIDs := make([]string, 0, sc.batchSize)

	for {
		select {
		case <-sc.ctx.Done():
			// Processa batch pendente antes de sair
			if len(batch) > 0 {
				sc.processBatch(batch, messageIDs)
			}
			log.Println("[Redis Consumer] Consumidor finalizado")
			return

		case <-ticker.C:
			// Timeout do batch - processa o que tem
			if len(batch) > 0 {
				sc.processBatch(batch, messageIDs)
				batch = batch[:0]
				messageIDs = messageIDs[:0]
			}

		default:
			// Tenta ler mensagens do stream
			messages, ids, err := sc.readMessages()
			if err != nil {
				log.Printf("[Redis Consumer] Erro ao ler mensagens: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}

			if len(messages) == 0 {
				// Nenhuma mensagem disponível, aguarda um pouco
				time.Sleep(100 * time.Millisecond)
				continue
			}

			// Adiciona ao batch
			batch = append(batch, messages...)
			messageIDs = append(messageIDs, ids...)

			// Se o batch está cheio, processa
			if len(batch) >= int(sc.batchSize) {
				sc.processBatch(batch, messageIDs)
				batch = batch[:0]
				messageIDs = messageIDs[:0]
			}
		}
	}
}

// readMessages lê mensagens do stream
func (sc *StreamConsumer) readMessages() ([]*StreamMessage, []string, error) {
	streams, err := sc.client.XReadGroup(sc.ctx, &redis.XReadGroupArgs{
		Group:    PersistConsumerGroup,
		Consumer: sc.consumerID,
		Streams:  []string{MessagesStream, ">"},
		Count:    sc.batchSize,
		Block:    100 * time.Millisecond,
	}).Result()

	if err != nil {
		if err == redis.Nil {
			return nil, nil, nil // Nenhuma mensagem
		}
		return nil, nil, err
	}

	if len(streams) == 0 || len(streams[0].Messages) == 0 {
		return nil, nil, nil
	}

	messages := make([]*StreamMessage, 0, len(streams[0].Messages))
	ids := make([]string, 0, len(streams[0].Messages))

	for _, msg := range streams[0].Messages {
		streamMsg, err := sc.parseMessage(msg)
		if err != nil {
			log.Printf("[Redis Consumer] Erro ao parsear mensagem %s: %v", msg.ID, err)
			// XACK mesmo com erro para não reprocessar
			sc.client.XAck(sc.ctx, MessagesStream, PersistConsumerGroup, msg.ID)
			continue
		}

		messages = append(messages, streamMsg)
		ids = append(ids, msg.ID)
	}

	return messages, ids, nil
}

// parseMessage parseia uma mensagem do Redis Stream
func (sc *StreamConsumer) parseMessage(msg redis.XMessage) (*StreamMessage, error) {
	streamMsg := &StreamMessage{
		RoomName: msg.Values["room_name"].(string),
	}

	if userID, ok := msg.Values["user_id"].(string); ok {
		streamMsg.UserID = userID
	}

	if username, ok := msg.Values["username"].(string); ok {
		streamMsg.Username = username
	}

	// Parse payload JSON
	if payloadStr, ok := msg.Values["payload"].(string); ok && payloadStr != "" {
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
			return nil, fmt.Errorf("erro ao parsear payload: %w", err)
		}
		streamMsg.Payload = payload
	}

	// Parse metadata JSON
	if metadataStr, ok := msg.Values["metadata"].(string); ok && metadataStr != "" {
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(metadataStr), &metadata); err != nil {
			return nil, fmt.Errorf("erro ao parsear metadata: %w", err)
		}
		streamMsg.Metadata = metadata
	}

	return streamMsg, nil
}

// processBatch processa um batch de mensagens
func (sc *StreamConsumer) processBatch(batch []*StreamMessage, ids []string) {
	log.Printf("[Redis Consumer] Processando batch de %d mensagens", len(batch))

	// Processa através do processor
	if err := sc.processor.ProcessBatch(batch); err != nil {
		log.Printf("[Redis Consumer] Erro ao processar batch: %v", err)
		// Em caso de erro, não fazemos ACK e as mensagens serão reprocessadas
		return
	}

	// Faz ACK de todas as mensagens processadas com sucesso
	if len(ids) > 0 {
		if err := sc.client.XAck(sc.ctx, MessagesStream, PersistConsumerGroup, ids...).Err(); err != nil {
			log.Printf("[Redis Consumer] Erro ao fazer ACK: %v", err)
		} else {
			log.Printf("[Redis Consumer] ACK de %d mensagens realizado", len(ids))
		}
	}
}

// Stop para o consumidor
func (sc *StreamConsumer) Stop() error {
	sc.cancel()

	if err := sc.client.Close(); err != nil {
		return fmt.Errorf("erro ao fechar cliente Redis: %w", err)
	}

	log.Println("[Redis Consumer] Consumidor parado")
	return nil
}
