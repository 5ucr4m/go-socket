package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/5ucr4m/go-socket/internal/config"
	"github.com/5ucr4m/go-socket/internal/pubsub"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Permitir todas as origens (ajustar em produção para domínios específicos)
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// serveWs faz o upgrade da conexão HTTP para WebSocket
func serveWs(hub *pubsub.Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erro ao fazer upgrade: %v", err)
		return
	}

	// Cria novo cliente usando o construtor
	client := pubsub.NewClient(hub, conn)

	// Registra o novo cliente no hub
	hub.Register(client)

	// Inicia goroutines para leitura e escrita
	// Cada cliente tem suas próprias goroutines dedicadas
	go client.WritePump()
	go client.ReadPump()
}

func main() {
	log.Println("🚀 Go-Socket Server iniciando...")

	// Carrega configurações
	cfg := config.Load()

	log.Printf("📋 Configurações:")
	log.Printf("   - Instance ID: %s", cfg.InstanceID)
	log.Printf("   - Server Port: %s", cfg.ServerPort)
	log.Printf("   - Redis URL: %s", cfg.RedisURL)

	// Cria e inicia o Hub com Redis
	var hub *pubsub.Hub
	var err error

	if cfg.RedisURL != "" {
		log.Println("📡 Inicializando Hub com Redis...")
		hub, err = pubsub.NewHubWithRedis(cfg.RedisURL, cfg.InstanceID)
		if err != nil {
			log.Fatalf("❌ Erro ao criar Hub com Redis: %v", err)
		}
		defer hub.Close()
	} else {
		log.Println("⚠️  Redis não configurado, usando Hub local (sem escalabilidade)")
		hub = pubsub.NewHub()
	}

	go hub.Run()

	// Configura rotas
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Rota de health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("OK - Instance: %s", cfg.InstanceID)))
	})

	// Servir arquivos estáticos (para o cliente React)
	fs := http.FileServer(http.Dir("./examples/client/dist"))
	http.Handle("/", fs)

	addr := ":" + cfg.ServerPort
	log.Printf("✅ Servidor WebSocket pronto em http://localhost%s", addr)
	log.Printf("📡 Endpoint WebSocket: ws://localhost%s/ws", addr)

	// Inicia servidor em goroutine
	server := &http.Server{Addr: addr}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Erro ao iniciar servidor: %v", err)
		}
	}()

	// Aguarda sinal de interrupção
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	log.Println("🛑 Sinal de shutdown recebido, finalizando...")
	log.Println("👋 Servidor finalizado")
}
