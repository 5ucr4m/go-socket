package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

const (
	// Canal para broadcast de mensagens entre instâncias
	BroadcastChannel = "gosocket:broadcast"
)

// MessageHandler é uma função que processa mensagens recebidas do Redis Pub/Sub
type MessageHandler func(payload []byte) error

// PubSubAdapter gerencia comunicação entre instâncias via Redis Pub/Sub
type PubSubAdapter struct {
	client     *redis.Client
	instanceID string
	pubsub     *redis.PubSub
	ctx        context.Context
	cancel     context.CancelFunc
}

// NewPubSubAdapter cria um novo adaptador de Pub/Sub
func NewPubSubAdapter(redisURL string, instanceID string) (*PubSubAdapter, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Testa a conexão
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("falha ao conectar no Redis: %w", err)
	}

	log.Printf("[Redis Pub/Sub] Conectado ao Redis em %s (instance: %s)", redisURL, instanceID)

	ctx, cancel := context.WithCancel(context.Background())

	return &PubSubAdapter{
		client:     client,
		instanceID: instanceID,
		ctx:        ctx,
		cancel:     cancel,
	}, nil
}

// Subscribe se inscreve no canal de broadcast e processa mensagens
func (p *PubSubAdapter) Subscribe(handler MessageHandler) error {
	// Se inscreve no canal
	p.pubsub = p.client.Subscribe(p.ctx, BroadcastChannel)

	// Aguarda confirmação da inscrição
	_, err := p.pubsub.Receive(p.ctx)
	if err != nil {
		return fmt.Errorf("falha ao se inscrever no canal: %w", err)
	}

	log.Printf("[Redis Pub/Sub] Inscrito no canal: %s", BroadcastChannel)

	// Inicia goroutine para processar mensagens
	go p.consumeMessages(handler)

	return nil
}

// consumeMessages processa mensagens recebidas do Redis Pub/Sub
func (p *PubSubAdapter) consumeMessages(handler MessageHandler) {
	ch := p.pubsub.Channel()

	for {
		select {
		case <-p.ctx.Done():
			log.Println("[Redis Pub/Sub] Consumidor finalizado")
			return

		case msg := <-ch:
			if msg == nil {
				continue
			}

			// Parse da mensagem
			var envelope MessageEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Printf("[Redis Pub/Sub] Erro ao deserializar mensagem: %v", err)
				continue
			}

			// Ignora mensagens da própria instância (para evitar loop)
			if envelope.InstanceID == p.instanceID {
				continue
			}

			log.Printf("[Redis Pub/Sub] Mensagem recebida de %s", envelope.InstanceID)

			// Processa a mensagem
			if err := handler(envelope.Payload); err != nil {
				log.Printf("[Redis Pub/Sub] Erro ao processar mensagem: %v", err)
			}
		}
	}
}

// Publish publica uma mensagem no canal de broadcast
func (p *PubSubAdapter) Publish(payload []byte) error {
	// Cria envelope com ID da instância
	envelope := MessageEnvelope{
		InstanceID: p.instanceID,
		Payload:    payload,
	}

	// Serializa
	data, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("erro ao serializar envelope: %w", err)
	}

	// Publica no canal
	if err := p.client.Publish(p.ctx, BroadcastChannel, data).Err(); err != nil {
		return fmt.Errorf("erro ao publicar mensagem: %w", err)
	}

	return nil
}

// Close fecha a conexão com o Redis
func (p *PubSubAdapter) Close() error {
	p.cancel()

	if p.pubsub != nil {
		if err := p.pubsub.Close(); err != nil {
			log.Printf("[Redis Pub/Sub] Erro ao fechar pubsub: %v", err)
		}
	}

	if err := p.client.Close(); err != nil {
		return fmt.Errorf("erro ao fechar cliente Redis: %w", err)
	}

	log.Println("[Redis Pub/Sub] Conexão fechada")
	return nil
}

// MessageEnvelope encapsula mensagens com metadata da instância
type MessageEnvelope struct {
	InstanceID string          `json:"instance_id"`
	Payload    json.RawMessage `json:"payload"`
}
