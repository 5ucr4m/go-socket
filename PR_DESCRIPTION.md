# Pull Request

## Título
```
feat: Sistema de Rooms com Pub/Sub e Presence Tracking
```

## Descrição

```markdown
## 🎯 Objetivo

Implementa um sistema completo de **Rooms (Salas de Chat)** com arquitetura **Pub/Sub** e **Presence Tracking** em tempo real, substituindo o sistema de broadcast simples anterior.

---

## 🚀 Features Implementadas

### 1️⃣ **Sistema de Pub/Sub**

Substituímos o modelo tradicional de `emit/on` por um sistema Pub/Sub mais escalável:

- ✅ **Subscribe**: Inscrição em salas com histórico opcional e limite configurável
- ✅ **Publish**: Publicação de mensagens em salas específicas
- ✅ **Unsubscribe**: Saída de salas
- ✅ **Histórico opcional**: Clientes podem receber mensagens anteriores ao se conectar

**Exemplo:**
```javascript
// Subscribe com histórico de 50 mensagens
ws.send(JSON.stringify({
  type: 'subscribe',
  room: 'sala-de-jogos',
  options: { history: true, limit: 50 }
}))
```

### 2️⃣ **Presence Tracking**

Sistema completo de tracking de usuários online:

- ✅ **Lista inicial**: Ao ativar presence, recebe todos os usuários online
- ✅ **user_joined**: Notificação quando alguém entra
- ✅ **user_left**: Notificação quando alguém sai
- ✅ **Separado de Subscribe**: Usuários podem ler sem aparecer como "online"

### 3️⃣ **Estrutura de Mensagem Padronizada**

```json
{
  "payload": {
    "message": "conteúdo da mensagem",
    "type": "text"
  },
  "user": {
    "id": "user-123",
    "name": "João"
  },
  "metadata": {
    "room": "sala-de-jogos",
    "createdAt": "2025-11-18T10:30:00Z",
    "subscriberCount": 5
  }
}
```

### 4️⃣ **Cliente React Modernizado**

Interface completa com:

- ✅ **Múltiplas salas**: 💬 Geral, 🎮 Jogos, 💻 Tech
- ✅ **Sidebar** com navegação entre salas
- ✅ **Lista de presença** em tempo real
- ✅ **Badge de contador** de usuários online
- ✅ **Indicador de histórico** em mensagens antigas
- ✅ **Mensagens de sistema** para eventos de presença
- ✅ **Interface responsiva** com Tailwind CSS

---

## 🏗️ Arquitetura

### Componentes Principais

```
Hub (WebSocket Manager)
  │
  ├── RoomManager (Gerencia múltiplas salas)
  │     │
  │     ├── Room 1 (sala-geral)
  │     │    ├── Subscribers
  │     │    ├── Presence Clients
  │     │    └── Message History (buffer circular)
  │     │
  │     ├── Room 2 (sala-de-jogos)
  │     └── Room N...
  │
  └── Clients (Conexões WebSocket)
```

### Decisões de Design

#### 1. **Buffer Circular para Histórico**
- Memória previsível e constante
- Performance O(1)
- Sem necessidade de limpeza manual

#### 2. **Thread-Safety com RWMutex**
- Múltiplas leituras simultâneas
- Escritas exclusivas
- Alta concorrência

#### 3. **Presence Separado de Subscribe**
- Privacidade (pode ler sem aparecer online)
- Performance (menos eventos)
- Flexibilidade (bots não aparecem como presentes)

#### 4. **Canais Não-Bloqueantes**
```go
select {
case client.send <- data:
    // Sucesso
default:
    // Cliente lento, não bloqueia broadcaster
}
```

---

## 📊 Performance

- **Lookups**: O(1) com maps
- **Subscribe**: O(1) + O(n) para histórico
- **Publish**: O(n) onde n = subscribers da sala
- **Memória**: Previsível com buffer circular
- **Concorrência**: Alta com RWMutex

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos (Backend)

- `internal/pubsub/room.go` (201 linhas)
  - Estrutura Room com gerenciamento de clientes
  - Buffer circular para histórico
  - Thread-safe com RWMutex

- `internal/pubsub/room_manager.go` (249 linhas)
  - Gerenciamento de múltiplas salas
  - Subscribe/Publish/Presence
  - Cleanup automático de salas vazias

- `internal/pubsub/types.go` (35 linhas)
  - Tipos de eventos (Subscribe, Publish, Presence, Unsubscribe)
  - Estruturas de opções e payloads

### Arquivos Modificados

- `internal/pubsub/client.go`
  - Suporte a userInfo e roomSubscriptions
  - Handlers para eventos de sala
  - Cleanup ao desconectar

- `internal/pubsub/hub.go`
  - Integração com RoomManager
  - Histórico padrão de 1000 mensagens

- `examples/client/src/App.tsx`
  - Interface completa com múltiplas salas
  - Types TypeScript para eventos
  - Tratamento de todos os eventos do servidor

- `examples/client/src/App.css`
  - Simplificado (usa principalmente Tailwind)
  - Scrollbar customizada

### Documentação

- `ROOMS_IMPLEMENTATION.md` (470 linhas)
  - Documentação técnica detalhada
  - Explicação de decisões de design
  - Diagramas de arquitetura
  - Exemplos de uso

---

## 🧪 Como Testar

### 1. Inicie o servidor Go:
```bash
go run cmd/server/main.go
```

### 2. Inicie o cliente React:
```bash
cd examples/client
bun install
bun run dev
```

### 3. Teste as features:

1. Abra múltiplas abas do navegador
2. Entre com nomes diferentes
3. Navegue entre as salas
4. Envie mensagens
5. Veja o histórico ao recarregar
6. Observe presence em tempo real

---

## 🎯 Comparação: Antes vs Depois

### Antes:
- ❌ Uma única sala (broadcast global)
- ❌ Sem histórico
- ❌ Sem presence tracking
- ❌ Mensagens não identificavam sender

### Depois:
- ✅ Múltiplas salas independentes
- ✅ Histórico configurável (até 1000 msgs/sala)
- ✅ Presence tracking em tempo real
- ✅ Mensagens com user info completo
- ✅ Eventos de entrada/saída
- ✅ Interface moderna

---

## 📚 Tecnologias

- **Backend**: Go 1.21+, Gorilla WebSocket
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Padrões**: Pub/Sub, Observer, Thread-safe patterns

---

## 🔜 Próximos Passos (Sugestões)

- [ ] Typing indicators (usuário digitando...)
- [ ] Read receipts (mensagens lidas)
- [ ] Mensagens privadas (DM)
- [ ] Upload de arquivos/imagens
- [ ] Reações a mensagens
- [ ] Moderação de salas
- [ ] Persistência com Redis/PostgreSQL
- [ ] Distribuição multi-instância

---

## 📝 Commits

- `2475c22` - feat: implementa sistema de Rooms com Pub/Sub e Presence
- `9fe065d` - feat: atualiza cliente React para usar sistema de Rooms

---

**Documentação completa**: Ver `ROOMS_IMPLEMENTATION.md` para detalhes técnicos profundos sobre decisões de arquitetura e implementação.
```

## URL para criar o PR

https://github.com/5ucr4m/go-socket/pull/new/claude/chat-rooms-pubsub-01KiZCzrpNjLCHP8BjLUnunu
