# 🎮 Sistema de Rooms - Documentação Técnica

## 📋 Visão Geral

Este documento explica a implementação do sistema de **Rooms (Salas de Chat)** com arquitetura **Pub/Sub** e **Presence Tracking**. O sistema permite que múltiplos usuários se conectem a diferentes salas, troquem mensagens em tempo real, acessem histórico de conversas e visualizem quem está online.

---

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│                         Hub                              │
│  - Gerencia conexões WebSocket                          │
│  - Coordena RoomManager                                  │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                    RoomManager                           │
│  - Gerencia múltiplas salas                             │
│  - Coordena Subscribe/Publish/Presence                   │
│  - Faz broadcast de mensagens                            │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                       Room                               │
│  - Armazena histórico de mensagens                       │
│  - Gerencia subscribers                                  │
│  - Gerencia presence tracking                            │
│  - Thread-safe com mutexes                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Decisões de Design

### 1. **Pub/Sub ao invés de Emit/On**

**Por que?**
- **Escalabilidade**: Pub/Sub permite adicionar múltiplos subscribers sem acoplamento direto
- **Flexibilidade**: Fácil adicionar novos tipos de eventos sem modificar código existente
- **Performance**: Mensagens são enviadas apenas para subscribers interessados, reduzindo tráfego
- **Desacoplamento**: Clientes não precisam conhecer outros clientes, apenas a sala

**Como funciona:**
```javascript
// Cliente faz subscribe
ws.send(JSON.stringify({
    type: 'subscribe',
    room: 'sala-de-jogos',
    options: { history: true, limit: 50 }
}))

// Cliente publica mensagem
ws.send(JSON.stringify({
    type: 'publish',
    room: 'sala-de-jogos',
    payload: { message: 'Olá!', type: 'text' }
}))
```

### 2. **Histórico Opcional com Limite Configurável**

**Por que?**
- **Eficiência de Rede**: Clientes escolhem se querem histórico
- **Controle de Banda**: Limite evita enviar milhares de mensagens antigas
- **Flexibilidade**: Diferentes casos de uso (chat vs notificações)
- **Memória**: Buffer circular evita crescimento infinito

**Implementação:**
```go
// Buffer circular automático
func (r *Room) AddMessage(msg *RoomMessage) {
    r.messageHistory = append(r.messageHistory, msg)

    if r.maxHistorySize > 0 && len(r.messageHistory) > r.maxHistorySize {
        // Mantém apenas as últimas maxHistorySize mensagens
        r.messageHistory = r.messageHistory[len(r.messageHistory)-r.maxHistorySize:]
    }
}
```

**Vantagens:**
- ✅ Uso de memória previsível
- ✅ Performance constante (O(1) para adicionar mensagens)
- ✅ Sem necessidade de limpeza manual
- ✅ Configurável por sala

### 3. **Presence Tracking Separado de Subscribe**

**Por que?**
- **Privacidade**: Usuários podem ler sem aparecer como "online"
- **Performance**: Reduz eventos desnecessários
- **Casos de Uso**: Bots/monitores não precisam aparecer como presentes
- **Flexibilidade**: Presence pode ser ativado/desativado independentemente

**Fluxo de Presence:**
```
1. Cliente ativa presence → Recebe lista atual de usuários
2. Outro usuário entra → Todos com presence recebem "user_joined"
3. Usuário sai → Todos com presence recebem "user_left"
```

### 4. **Thread-Safety com Read/Write Mutexes**

**Por que?**
- **Concorrência**: Múltiplas goroutines acessam salas simultaneamente
- **Performance**: RWMutex permite múltiplas leituras simultâneas
- **Segurança**: Evita race conditions e corrupção de dados

**Implementação:**
```go
type Room struct {
    mu sync.RWMutex  // Read/Write mutex
    // ...
}

// Leitura (múltiplas simultâneas)
func (r *Room) GetHistory(limit int) []*RoomMessage {
    r.mu.RLock()         // Lock de leitura
    defer r.mu.RUnlock()
    // ...
}

// Escrita (exclusiva)
func (r *Room) AddMessage(msg *RoomMessage) {
    r.mu.Lock()          // Lock de escrita
    defer r.mu.Unlock()
    // ...
}
```

**Benefícios:**
- ✅ Alta performance em leituras (não bloqueiam entre si)
- ✅ Segurança em escritas (bloqueiam tudo)
- ✅ Previne deadlocks com defer

### 5. **Estrutura de Mensagem Padronizada**

**Por que?**
```json
{
  "payload": {
    "message": "Conteúdo da mensagem",
    "type": "text"
  },
  "user": {
    "id": "user-123",
    "name": "João"
  },
  "metadata": {
    "room": "sala-de-jogos",
    "createdAt": "2025-11-18T10:30:00Z"
  }
}
```

**Vantagens:**
- ✅ **Extensível**: Fácil adicionar novos campos
- ✅ **Tipado**: `type` permite diferentes tipos de mensagem (text, image, file, etc)
- ✅ **Rastreável**: Metadata com timestamp e sala
- ✅ **Identificável**: User info para atribuição

### 6. **Cleanup Automático de Salas Vazias**

**Por que?**
- **Memória**: Evita vazamento de memória com salas abandonadas
- **Performance**: Menos estruturas para iterar
- **Automático**: Não requer intervenção manual

**Implementação:**
```go
func (rm *RoomManager) RemoveRoom(name string) {
    if room.IsEmpty() {
        delete(rm.rooms, name)
        log.Printf("Sala removida: %s", name)
    }
}
```

### 7. **Canais com Buffer**

**Por que?**
- **Performance**: Reduz bloqueios
- **Resiliência**: Tolera picos temporários de mensagens
- **Não-bloqueante**: Escritas rápidas sem esperar receptor

**Implementação:**
```go
send: make(chan []byte, 256)  // Buffer de 256 mensagens
```

**Trade-offs:**
- ✅ Melhor throughput
- ✅ Menos contenção
- ⚠️ Usa mais memória
- ⚠️ Mensagens podem ser perdidas se buffer encher

---

## 📊 Performance e Otimizações

### 1. **Maps para Lookups O(1)**

```go
rooms map[string]*Room              // O(1) para encontrar sala
subscribers map[*Client]bool        // O(1) para verificar se é subscriber
presenceClients map[*Client]bool    // O(1) para verificar presence
```

### 2. **Cópia de Slices para Thread-Safety**

```go
func (r *Room) GetSubscribers() []*Client {
    r.mu.RLock()
    defer r.mu.RUnlock()

    // Cria cópia para evitar race conditions
    clients := make([]*Client, 0, len(r.subscribers))
    for client := range r.subscribers {
        clients = append(clients, client)
    }
    return clients
}
```

### 3. **Select com Default para Não-Bloqueio**

```go
select {
case client.send <- data:
    // Enviado com sucesso
default:
    // Canal cheio, cliente lento/travado
    log.Printf("Cliente não pode receber mensagem")
}
```

**Benefícios:**
- ✅ Não bloqueia o broadcaster
- ✅ Identifica clientes lentos
- ✅ Previne deadlocks

---

## 🔄 Fluxo de Eventos

### Subscribe com Histórico

```
Cliente                RoomManager              Room
   │                        │                    │
   │──subscribe(history)──→ │                    │
   │                        │──GetOrCreate──→    │
   │                        │                    │
   │                        │──Subscribe()──→    │
   │                        │                    │
   │                        │←──GetHistory()───  │
   │                        │                    │
   │←───[histórico]────────│                    │
   │                        │                    │
```

### Publish com Broadcast

```
Cliente A            RoomManager              Room              Cliente B
   │                      │                    │                    │
   │──publish()──→        │                    │                    │
   │                      │──AddMessage()──→   │                    │
   │                      │                    │                    │
   │                      │←──GetSubscribers() │                    │
   │                      │                    │                    │
   │                      │──────────────broadcast──────────────→   │
   │                      │                                          │
```

### Presence

```
Cliente A            RoomManager              Room              Cliente B (presence)
   │                      │                    │                    │
   │──presence()──→       │                    │                    │
   │                      │──AddPresence()──→  │                    │
   │                      │                    │                    │
   │←──[presence_list]──  │                    │                    │
   │                      │                    │                    │
   │                      │────────[user_joined]──────────────────→ │
   │                      │                    │                    │
```

---

## 🛡️ Considerações de Segurança

### 1. **Validação de Entrada**

```go
if event.Room == "" {
    log.Printf("Nome de sala inválido")
    return
}
```

### 2. **Limite de Tamanho de Mensagem**

```go
const maxMessageSize = 8192  // 8KB
c.conn.SetReadLimit(maxMessageSize)
```

### 3. **Timeout em Escritas**

```go
c.conn.SetWriteDeadline(time.Now().Add(writeWait))
```

### 4. **Cleanup em Desconexão**

```go
defer func() {
    c.hub.roomManager.RemoveClientFromAllRooms(c)
    c.hub.unregister <- c
    c.conn.Close()
}()
```

---

## 🚀 Escalabilidade

### Limitações Atuais
- Todas as salas em memória (não persistente)
- Single-instance (não distribuído)
- Histórico limitado por sala

### Próximos Passos para Escalar
1. **Redis Pub/Sub** para múltiplas instâncias
2. **PostgreSQL/MongoDB** para persistência de histórico
3. **Message Queue** (RabbitMQ, Kafka) para processamento assíncrono
4. **CDN/Load Balancer** para distribuir conexões WebSocket

---

## 📝 Exemplo de Uso

### Cliente JavaScript

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// 1. Subscribe com histórico
ws.send(JSON.stringify({
    type: 'subscribe',
    room: 'sala-de-jogos',
    user: { id: 'user-123', name: 'João' },
    options: { history: true, limit: 50 }
}));

// 2. Ativar presence
ws.send(JSON.stringify({
    type: 'presence',
    room: 'sala-de-jogos',
    user: { id: 'user-123', name: 'João' }
}));

// 3. Publicar mensagem
ws.send(JSON.stringify({
    type: 'publish',
    room: 'sala-de-jogos',
    user: { id: 'user-123', name: 'João' },
    payload: { message: 'Olá pessoal!', type: 'text' }
}));

// 4. Receber mensagens
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch(data.type) {
        case 'message':
            console.log('Nova mensagem:', data);
            break;
        case 'history':
            console.log('Histórico:', data);
            break;
        case 'presence_list':
            console.log('Usuários online:', data.presenceList);
            break;
        case 'user_joined':
            console.log('Entrou:', data.user.name);
            break;
        case 'user_left':
            console.log('Saiu:', data.user.name);
            break;
    }
};
```

---

## 🎯 Conclusão

Esta implementação oferece um sistema de rooms **robusto**, **performático** e **escalável** com as seguintes características:

✅ **Thread-safe** com mutexes apropriados
✅ **Eficiente** com O(1) lookups e buffer circular
✅ **Flexível** com histórico opcional e presence separado
✅ **Resiliente** com cleanup automático e tratamento de erros
✅ **Extensível** para diferentes tipos de mensagens
✅ **Performático** com canais assíncronos e não-bloqueantes

A arquitetura permite fácil extensão para features como:
- Mensagens privadas (DM)
- Typing indicators
- Read receipts
- Reações a mensagens
- Arquivos/imagens
- Moderação
- Permissões por sala

---

## 📚 Referências

- [Gorilla WebSocket](https://github.com/gorilla/websocket)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Effective Go](https://go.dev/doc/effective_go)
