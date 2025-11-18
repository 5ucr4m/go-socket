# 🚀 Escalabilidade Horizontal - Go-Socket

Este documento descreve a arquitetura de escalabilidade horizontal implementada no Go-Socket.

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (Nginx)                     │
│                     http://localhost:8080                    │
└────────────┬────────────┬────────────┬──────────────────────┘
             │            │            │
       ┌─────▼────┐ ┌────▼─────┐ ┌───▼──────┐
       │ Server 1 │ │ Server 2 │ │ Server 3 │  (N instâncias)
       │  :8081   │ │  :8082   │ │  :8083   │
       └─────┬────┘ └────┬─────┘ └───┬──────┘
             │            │            │
             └────────────┼────────────┘
                          │
                ┌─────────▼──────────┐
                │   REDIS PUB/SUB    │  (Sincronização em tempo real)
                │   REDIS STREAMS    │  (Fila de persistência)
                └─────────┬──────────┘
                          │
                    ┌─────▼──────┐
                    │   WORKER   │  (Processa stream)
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │ PostgreSQL │  (Persistência)
                    └────────────┘
```

## 🔄 Fluxo de Mensagens

### 1. Cliente envia mensagem via WebSocket

```
Cliente A → Nginx → Server 2 (qualquer instância)
```

### 2. Server processa e distribui

```
Server 2:
  ├─ Broadcast LOCAL (clientes conectados no Server 2)
  ├─ Publica no Redis Pub/Sub (outras instâncias)
  └─ Enfileira no Redis Streams (persistência assíncrona)
```

### 3. Outras instâncias recebem via Pub/Sub

```
Redis Pub/Sub → Server 1, Server 3
                   │
                   └─ Broadcast LOCAL (clientes dessas instâncias)
```

### 4. Worker persiste de forma assíncrona

```
Worker consome Redis Streams (em batch)
   └─ Batch INSERT no PostgreSQL (100 msgs ou 5s)
```

## 🛠️ Componentes

### **Redis Pub/Sub**
- **Propósito**: Sincronização em tempo real entre instâncias
- **Padrão**: Publisher-Subscriber
- **Latência**: Microsegundos
- **Garantias**: Fire-and-forget (best effort)

### **Redis Streams**
- **Propósito**: Fila de persistência com garantias
- **Padrão**: Consumer Groups
- **Garantias**: At-least-once delivery com ACK
- **Persistência**: AOF/RDB habilitado

### **PostgreSQL**
- **Propósito**: Armazenamento durável de mensagens
- **Otimização**: Batch INSERT via COPY
- **Schema**: Ver `migrations/init.sql`

### **Nginx**
- **Propósito**: Load balancer com suporte a WebSocket
- **Estratégia**: IP Hash (sticky sessions)
- **Health checks**: Endpoint `/health`

## 🚀 Como Executar

### Subir toda a infraestrutura

```bash
docker-compose up --build
```

Isso irá iniciar:
- 3 instâncias do servidor Go (portas 8081, 8082, 8083)
- 1 worker de persistência
- 1 instância Redis
- 1 instância PostgreSQL
- 1 Nginx (load balancer na porta 8080)

### Acessar

```bash
# Via Load Balancer (recomendado)
http://localhost:8080

# WebSocket endpoint
ws://localhost:8080/ws

# Health check
curl http://localhost:8080/health
```

### Escalar horizontalmente

```bash
# Adicionar mais 2 instâncias
docker-compose up --scale server-1=5

# Ou editar docker-compose.yml e adicionar server-4, server-5, etc.
```

## 📊 Monitoramento

### Logs das instâncias

```bash
# Ver logs de uma instância específica
docker-compose logs -f server-1

# Ver logs do worker
docker-compose logs -f worker

# Ver logs de todos os servidores
docker-compose logs -f server-1 server-2 server-3
```

### Redis CLI

```bash
# Conectar ao Redis
docker exec -it go-socket-redis redis-cli

# Ver mensagens no stream
XLEN gosocket:messages:stream

# Ver consumer groups
XINFO GROUPS gosocket:messages:stream

# Ver mensagens pendentes
XPENDING gosocket:messages:stream persist-workers
```

### PostgreSQL

```bash
# Conectar ao PostgreSQL
docker exec -it go-socket-postgres psql -U gosocket

# Ver total de mensagens
SELECT COUNT(*) FROM messages;

# Ver mensagens por sala
SELECT room_name, COUNT(*) FROM messages GROUP BY room_name;

# Ver estatísticas de salas
SELECT * FROM room_stats;
```

## 🧪 Testando a Escalabilidade

### Teste 1: Clientes em instâncias diferentes

1. Abra o navegador A: `http://localhost:8080`
2. Abra o navegador B: `http://localhost:8080` (modo anônimo)
3. Envie mensagem do navegador A
4. Verifique que navegador B recebe (mesmo estando em instâncias diferentes)

### Teste 2: Verificar distribuição de carga

```bash
# Ver qual instância está processando cada cliente
docker-compose logs | grep "Cliente conectado"

# Resultado esperado: clientes distribuídos entre server-1, server-2, server-3
```

### Teste 3: Resiliência

```bash
# Derrubar uma instância
docker-compose stop server-2

# Verificar que sistema continua funcionando
# Novos clientes vão para server-1 e server-3
# Mensagens continuam sendo sincronizadas

# Subir novamente
docker-compose start server-2
```

## ⚙️ Configuração

### Variáveis de Ambiente

Ver `.env.example` para lista completa.

**Servidor:**
- `SERVER_PORT`: Porta do servidor (padrão: 8080)
- `INSTANCE_ID`: Identificador único da instância
- `REDIS_URL`: URL do Redis (host:port)
- `POSTGRES_URL`: Connection string do PostgreSQL

**Worker:**
- `WORKER_ENABLED`: true para modo worker
- `WORKER_ID`: Identificador único do worker
- `BATCH_SIZE`: Tamanho do batch (padrão: 100)
- `BATCH_TIMEOUT`: Timeout do batch (padrão: 5s)

## 🔧 Troubleshooting

### Problema: Mensagens não chegam em outras instâncias

**Solução:**
```bash
# Verificar se Redis Pub/Sub está funcionando
docker exec -it go-socket-redis redis-cli
> PUBSUB CHANNELS
# Deve mostrar: gosocket:broadcast

# Ver logs do Redis
docker-compose logs redis
```

### Problema: Mensagens não são persistidas

**Solução:**
```bash
# Verificar se worker está rodando
docker-compose ps worker

# Ver logs do worker
docker-compose logs -f worker

# Verificar stream
docker exec -it go-socket-redis redis-cli XLEN gosocket:messages:stream
```

### Problema: Alta latência

**Causas possíveis:**
- Batch muito grande no worker
- PostgreSQL sobrecarregado
- Redis sem AOF configurado

**Solução:**
- Reduzir `BATCH_SIZE` ou `BATCH_TIMEOUT`
- Adicionar mais workers: `docker-compose up --scale worker=3`
- Verificar índices no PostgreSQL

## 📈 Performance

### Benchmarks esperados

- **Latência P99**: < 10ms (broadcast entre instâncias)
- **Throughput**: ~10k msgs/segundo por instância
- **Persistência**: ~5k msgs/segundo (batch de 100)

### Otimizações possíveis

1. **Mais workers**: Aumentar número de workers para paralelizar gravação
2. **Batch maior**: Aumentar `BATCH_SIZE` para 500-1000 (trade-off com latência)
3. **Connection pooling**: Ajustar `max_conns` do PostgreSQL
4. **Redis clustering**: Para volumes muito altos (milhões de msgs/s)

## 🎯 Próximos Passos

- [ ] Adicionar métricas (Prometheus)
- [ ] Adicionar tracing distribuído (Jaeger)
- [ ] Implementar circuit breaker
- [ ] Adicionar rate limiting
- [ ] Suporte a múltiplos workers com particionamento

---

**Documentação:** Para mais informações, ver [README.md](README.md)
