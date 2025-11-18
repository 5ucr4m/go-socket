package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/5ucr4m/go-socket/internal/redis"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MessageRepository gerencia a persistência de mensagens no PostgreSQL
type MessageRepository struct {
	pool *pgxpool.Pool
}

// NewMessageRepository cria um novo repositório de mensagens
func NewMessageRepository(postgresURL string) (*MessageRepository, error) {
	ctx := context.Background()

	// Cria pool de conexões
	pool, err := pgxpool.New(ctx, postgresURL)
	if err != nil {
		return nil, fmt.Errorf("falha ao criar pool de conexões: %w", err)
	}

	// Testa a conexão
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("falha ao conectar no PostgreSQL: %w", err)
	}

	log.Printf("[PostgreSQL] Conectado ao banco de dados")

	return &MessageRepository{
		pool: pool,
	}, nil
}

// SaveBatch salva um lote de mensagens usando batch insert
func (r *MessageRepository) SaveBatch(messages []*redis.StreamMessage) error {
	if len(messages) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Inicia transação
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	// Usa COPY para inserção em massa (mais eficiente)
	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{"messages"},
		[]string{"room_name", "user_id", "username", "payload", "metadata", "created_at"},
		pgx.CopyFromSlice(len(messages), func(i int) ([]interface{}, error) {
			msg := messages[i]

			// Serializa payload para JSONB
			payloadJSON, err := json.Marshal(msg.Payload)
			if err != nil {
				return nil, fmt.Errorf("erro ao serializar payload: %w", err)
			}

			// Serializa metadata para JSONB
			metadataJSON, err := json.Marshal(msg.Metadata)
			if err != nil {
				return nil, fmt.Errorf("erro ao serializar metadata: %w", err)
			}

			return []interface{}{
				msg.RoomName,
				msg.UserID,
				msg.Username,
				payloadJSON,
				metadataJSON,
				time.Now(),
			}, nil
		}),
	)

	if err != nil {
		return fmt.Errorf("erro ao executar COPY: %w", err)
	}

	// Commit da transação
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("erro ao commitar transação: %w", err)
	}

	log.Printf("[PostgreSQL] Batch de %d mensagens gravado com sucesso", len(messages))
	return nil
}

// GetRecentMessages retorna as mensagens mais recentes de uma sala
func (r *MessageRepository) GetRecentMessages(roomName string, limit int) ([]*redis.StreamMessage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := `
		SELECT room_name, user_id, username, payload, metadata
		FROM messages
		WHERE room_name = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, roomName, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar mensagens: %w", err)
	}
	defer rows.Close()

	messages := make([]*redis.StreamMessage, 0, limit)

	for rows.Next() {
		var msg redis.StreamMessage
		var payloadJSON, metadataJSON []byte

		err := rows.Scan(
			&msg.RoomName,
			&msg.UserID,
			&msg.Username,
			&payloadJSON,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao scanear linha: %w", err)
		}

		// Deserializa payload
		if err := json.Unmarshal(payloadJSON, &msg.Payload); err != nil {
			return nil, fmt.Errorf("erro ao deserializar payload: %w", err)
		}

		// Deserializa metadata
		if err := json.Unmarshal(metadataJSON, &msg.Metadata); err != nil {
			return nil, fmt.Errorf("erro ao deserializar metadata: %w", err)
		}

		messages = append(messages, &msg)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erro ao iterar linhas: %w", err)
	}

	return messages, nil
}

// GetStats retorna estatísticas do banco
func (r *MessageRepository) GetStats() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	stats := make(map[string]interface{})

	// Total de mensagens
	var totalMessages int64
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM messages").Scan(&totalMessages)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar mensagens: %w", err)
	}
	stats["total_messages"] = totalMessages

	// Total de salas
	var totalRooms int64
	err = r.pool.QueryRow(ctx, "SELECT COUNT(DISTINCT room_name) FROM messages").Scan(&totalRooms)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar salas: %w", err)
	}
	stats["total_rooms"] = totalRooms

	// Pool stats
	poolStats := r.pool.Stat()
	stats["db_connections"] = map[string]interface{}{
		"total":          poolStats.TotalConns(),
		"idle":           poolStats.IdleConns(),
		"acquired":       poolStats.AcquiredConns(),
		"max_conns":      poolStats.MaxConns(),
		"acquire_count":  poolStats.AcquireCount(),
		"acquire_duration": poolStats.AcquireDuration().String(),
	}

	return stats, nil
}

// Close fecha o pool de conexões
func (r *MessageRepository) Close() {
	r.pool.Close()
	log.Println("[PostgreSQL] Pool de conexões fechado")
}

// ProcessBatch implementa a interface MessageProcessor
func (r *MessageRepository) ProcessBatch(messages []*redis.StreamMessage) error {
	return r.SaveBatch(messages)
}
