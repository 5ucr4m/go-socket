# Go-Socket: Sistema Pub-Sub em Go

Um projeto de aprendizado para implementar um sistema de publicação-assinatura (pub-sub) similar ao Socket.IO, escrito em Go.

## 📚 Sobre o Projeto

Este é um projeto educacional para aprender Go Lang através da construção de um sistema de comunicação em tempo real baseado no padrão Pub-Sub (Publisher-Subscriber).

## 🎯 Objetivos

- Aprender os fundamentos de Go
- Implementar comunicação em tempo real via WebSockets
- Entender o padrão Pub-Sub
- Construir uma API similar ao Socket.IO
- **Escalar horizontalmente** com Redis Pub/Sub e Streams

## 📁 Estrutura do Projeto

```
go-socket/
├── cmd/
│   ├── server/              # Servidor HTTP + WebSocket
│   │   └── main.go
│   └── worker/              # Worker de persistência
│       └── main.go
├── internal/
│   ├── pubsub/              # Lógica do sistema Pub-Sub
│   │   ├── hub.go           # Gerenciador de conexões
│   │   ├── client.go        # Cliente WebSocket
│   │   └── room_manager.go # Gerenciador de salas
│   ├── redis/               # Redis Pub/Sub e Streams
│   │   ├── pubsub.go        # Sincronização entre instâncias
│   │   ├── streams.go       # Producer para fila de persistência
│   │   └── consumer.go      # Consumer group worker
│   ├── persistence/         # Camada de persistência
│   │   └── repository.go    # PostgreSQL repository
│   └── config/              # Configurações
│       └── config.go
├── examples/client/         # Cliente React de exemplo
│   ├── src/
│   │   ├── App.jsx          # Interface de chat
│   │   └── index.css        # Estilos Tailwind
│   ├── package.json
│   └── tailwind.config.js
├── migrations/              # Schemas SQL
│   └── init.sql
├── docker-compose.yml       # Orquestração completa
├── Dockerfile               # Multi-stage build
└── SCALING.md              # Documentação de escalabilidade
```

## 🚀 Como Executar

### 🐳 Com Docker (Recomendado - Múltiplas Instâncias)

```bash
# Subir toda a infraestrutura (3 servidores + worker + Redis + PostgreSQL + Nginx)
docker-compose up --build

# Acessar
http://localhost:8080  # Load balancer (Nginx)
```

Isso inicia:
- **3 instâncias** do servidor Go (portas 8081, 8082, 8083)
- **1 worker** de persistência
- **Redis** (Pub/Sub + Streams)
- **PostgreSQL** (armazenamento)
- **Nginx** (load balancer na porta 8080)

📖 **Ver [SCALING.md](SCALING.md)** para detalhes sobre escalabilidade horizontal

### 💻 Desenvolvimento Local (Modo Single Instance)

```bash
# Servidor Go
go run cmd/server/main.go

# Cliente React
cd examples/client
npm install
npm run dev
```

Servidor: http://localhost:8080
Cliente: http://localhost:5173

📖 **Documentação completa:** Veja [USAGE.md](USAGE.md) para instruções detalhadas.

## 📖 Aprendizado

Este projeto foi desenvolvido em etapas, cada uma focando em conceitos específicos de Go:

1. ✅ Inicialização do projeto e estrutura
2. ✅ Tipos básicos e structs (Client, Hub)
3. ✅ Goroutines e channels (readPump, writePump, broadcast)
4. ✅ WebSockets (gorilla/websocket)
5. ✅ Sistema Pub-Sub básico (broadcast para todos os clientes)
6. ✅ Sistema de Rooms com Pub/Sub e Presence
7. ✅ **Escalabilidade horizontal** (Redis Pub/Sub + Streams)
8. ✅ **Persistência assíncrona** (PostgreSQL com batch insert)

## 🎨 Funcionalidades Implementadas

### Servidor Go
- ✅ Servidor HTTP com endpoint WebSocket
- ✅ Hub central para gerenciar conexões
- ✅ Sistema de broadcast em tempo real
- ✅ Goroutines dedicadas por cliente (leitura e escrita)
- ✅ Ping/Pong automático para keep-alive
- ✅ Tratamento de desconexões
- ✅ **Sistema de Rooms** (pub/sub por sala, presence tracking)
- ✅ **Escalabilidade horizontal** (múltiplas instâncias sincronizadas)
- ✅ **Persistência de mensagens** (PostgreSQL com batch insert)
- ✅ **Redis Pub/Sub** (sincronização entre instâncias)
- ✅ **Redis Streams** (fila de persistência com Consumer Groups)

### Cliente React
- ✅ Interface de chat moderna com Tailwind CSS
- ✅ Conexão WebSocket nativa (sem bibliotecas)
- ✅ Indicador de status de conexão
- ✅ Sistema de mensagens em tempo real
- ✅ Auto-scroll para novas mensagens
- ✅ Timestamps
- ✅ Tela de login com username

## 🔌 Como Funciona o WebSocket em Go

O projeto demonstra os conceitos fundamentais de WebSocket em Go:

1. **Goroutines**: Cada cliente tem 2 goroutines dedicadas (leitura e escrita)
2. **Channels**: Comunicação type-safe entre goroutines
3. **Hub Pattern**: Gerenciador central usando `select` para multiplexar canais
4. **Broadcast**: Mensagens são enviadas para todos os clientes conectados

### Fluxo de Conexão
```
Cliente → HTTP Request → Upgrade para WebSocket →
Hub registra cliente → Goroutines iniciadas →
Mensagens fluem através de channels → Broadcast para todos
```

## 📝 Licença

MIT
