package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/5ucr4m/go-socket/internal/config"
	"github.com/5ucr4m/go-socket/internal/persistence"
	"github.com/5ucr4m/go-socket/internal/redis"
)

func main() {
	log.Println("🚀 Go-Socket Worker iniciando...")

	// Carrega configurações
	cfg := config.Load()

	log.Printf("📋 Configurações:")
	log.Printf("   - Worker ID: %s", cfg.WorkerID)
	log.Printf("   - Redis URL: %s", cfg.RedisURL)
	log.Printf("   - Batch Size: %d", cfg.BatchSize)
	log.Printf("   - Batch Timeout: %s", cfg.BatchTimeout)

	// Inicializa repository do PostgreSQL
	log.Println("🗄️  Conectando ao PostgreSQL...")
	repo, err := persistence.NewMessageRepository(cfg.PostgresURL)
	if err != nil {
		log.Fatalf("❌ Erro ao conectar no PostgreSQL: %v", err)
	}
	defer repo.Close()

	// Inicializa consumer do Redis Streams
	log.Println("📡 Conectando ao Redis Streams...")
	consumer, err := redis.NewStreamConsumer(redis.ConsumerConfig{
		RedisURL:     cfg.RedisURL,
		ConsumerID:   cfg.WorkerID,
		BatchSize:    int64(cfg.BatchSize),
		BatchTimeout: cfg.BatchTimeout,
	}, repo)
	if err != nil {
		log.Fatalf("❌ Erro ao criar consumer: %v", err)
	}
	defer consumer.Stop()

	// Inicia consumo
	log.Println("🔄 Iniciando consumo de mensagens...")
	if err := consumer.Start(); err != nil {
		log.Fatalf("❌ Erro ao iniciar consumer: %v", err)
	}

	log.Println("✅ Worker pronto e aguardando mensagens")

	// Aguarda sinal de interrupção
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	log.Println("🛑 Sinal de shutdown recebido, finalizando...")

	// Imprime estatísticas antes de sair
	stats, err := repo.GetStats()
	if err != nil {
		log.Printf("⚠️  Erro ao obter estatísticas: %v", err)
	} else {
		log.Printf("📊 Estatísticas finais: %+v", stats)
	}

	log.Println("👋 Worker finalizado")
}
