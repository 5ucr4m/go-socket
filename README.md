# Go-Socket: Sistema Pub-Sub em Go

Um projeto de aprendizado para implementar um sistema de publicação-assinatura (pub-sub) similar ao Socket.IO, escrito em Go.

## 📚 Sobre o Projeto

Este é um projeto educacional para aprender Go Lang através da construção de um sistema de comunicação em tempo real baseado no padrão Pub-Sub (Publisher-Subscriber).

## 🎯 Objetivos

- Aprender os fundamentos de Go
- Implementar comunicação em tempo real via WebSockets
- Entender o padrão Pub-Sub
- Construir uma API similar ao Socket.IO

## 📁 Estrutura do Projeto

```
go-socket/
├── cmd/server/              # Servidor HTTP + WebSocket
│   └── main.go
├── internal/pubsub/         # Lógica do sistema Pub-Sub
│   ├── hub.go              # Gerenciador de conexões
│   └── client.go           # Cliente WebSocket
├── examples/client/         # Cliente React de exemplo
│   ├── src/
│   │   ├── App.jsx         # Interface de chat
│   │   └── index.css       # Estilos Tailwind
│   ├── package.json
│   └── tailwind.config.js
└── pkg/gosocket/           # Biblioteca pública (futuro)
```

## 🚀 Como Executar

### Servidor Go
```bash
# Opção 1: Executar diretamente
go run cmd/server/main.go

# Opção 2: Compilar e executar
go build -o bin/server ./cmd/server
./bin/server
```

Servidor disponível em:
- **HTTP:** http://localhost:8080
- **WebSocket:** ws://localhost:8080/ws

### Cliente React
```bash
cd examples/client
npm install
npm run dev
```

Cliente disponível em: http://localhost:5173

📖 **Documentação completa:** Veja [USAGE.md](USAGE.md) para instruções detalhadas.

## 📖 Aprendizado

Este projeto foi desenvolvido em etapas, cada uma focando em conceitos específicos de Go:

1. ✅ Inicialização do projeto e estrutura
2. ✅ Tipos básicos e structs (Client, Hub)
3. ✅ Goroutines e channels (readPump, writePump, broadcast)
4. ✅ WebSockets (gorilla/websocket)
5. ✅ Sistema Pub-Sub básico (broadcast para todos os clientes)
6. 🚧 Multiplexação de eventos (próxima etapa)

## 🎨 Funcionalidades Implementadas

### Servidor Go
- ✅ Servidor HTTP com endpoint WebSocket
- ✅ Hub central para gerenciar conexões
- ✅ Sistema de broadcast em tempo real
- ✅ Goroutines dedicadas por cliente (leitura e escrita)
- ✅ Ping/Pong automático para keep-alive
- ✅ Tratamento de desconexões

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
