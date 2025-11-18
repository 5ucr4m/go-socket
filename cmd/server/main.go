package main

import (
	"log"
	"net/http"

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
	// Cria e inicia o Hub
	hub := pubsub.NewHub()
	go hub.Run()

	// Configura rotas
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Rota de health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Servir arquivos estáticos (para o cliente React)
	fs := http.FileServer(http.Dir("./examples/client/dist"))
	http.Handle("/", fs)

	addr := ":8080"
	log.Printf("🚀 Servidor WebSocket iniciado em http://localhost%s", addr)
	log.Printf("📡 Endpoint WebSocket: ws://localhost%s/ws", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
