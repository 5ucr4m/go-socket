# 🚀 Como Executar o Go-Socket

## Pré-requisitos

- Go 1.24.7 ou superior
- Node.js 18+ e npm (para o cliente React)

## 🖥️ Executando o Servidor

### Opção 1: Compilar e executar
```bash
# Na raiz do projeto
go build -o bin/server ./cmd/server
./bin/server
```

### Opção 2: Executar diretamente
```bash
go run cmd/server/main.go
```

O servidor estará disponível em:
- **HTTP:** http://localhost:8080
- **WebSocket:** ws://localhost:8080/ws
- **Health Check:** http://localhost:8080/health

## 💻 Executando o Cliente React

```bash
# Navegue até o diretório do cliente
cd examples/client

# Instale as dependências (primeira vez)
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O cliente estará disponível em http://localhost:5173

## 🧪 Testando a Comunicação

### 1. Abra múltiplas abas do navegador
Abra 2 ou mais abas apontando para http://localhost:5173

### 2. Configure usernames diferentes
Cada aba represente um usuário diferente

### 3. Envie mensagens
As mensagens enviadas em uma aba aparecerão em todas as outras em tempo real!

## 📡 Testando com WebSocket Nativo (JavaScript Console)

Você também pode testar diretamente no console do navegador:

```javascript
// Conectar
const ws = new WebSocket('ws://localhost:8080/ws');

// Eventos
ws.onopen = () => console.log('Conectado!');
ws.onmessage = (e) => console.log('Recebido:', e.data);

// Enviar mensagem
ws.send('Olá do console!');
```

## 🔧 Estrutura de Arquivos Criados

```
go-socket/
├── cmd/server/
│   └── main.go              # Servidor HTTP + WebSocket
├── internal/pubsub/
│   ├── hub.go               # Gerenciador de conexões
│   └── client.go            # Cliente WebSocket
├── examples/client/
│   ├── src/
│   │   ├── App.jsx          # Interface de chat
│   │   └── index.css        # Estilos Tailwind
│   ├── package.json
│   └── tailwind.config.js
└── bin/
    └── server               # Executável compilado
```

## 📊 Logs do Servidor

Quando o servidor está rodando, você verá logs como:

```
🚀 Servidor WebSocket iniciado em http://localhost:8080
📡 Endpoint WebSocket: ws://localhost:8080/ws
Cliente conectado. Total: 1
Mensagem recebida: João: Olá!
Broadcasting para 2 clientes: João: Olá!
Cliente desconectado. Total: 1
```

## 🎯 Próximos Passos

Este é um exemplo básico de broadcast. Para expandir o sistema:

1. **Rooms** - Agrupar clientes em salas separadas
2. **Eventos** - Sistema de eventos tipados (como Socket.IO)
3. **Autenticação** - JWT/OAuth para validar usuários
4. **Persistência** - Salvar mensagens em banco de dados
5. **Reconexão** - Auto-reconectar em caso de queda
6. **Presença** - Lista de usuários online

## 🐛 Troubleshooting

### Erro: "connection refused"
- Certifique-se de que o servidor Go está rodando em localhost:8080

### Erro: "CORS blocked"
- O servidor já está configurado para aceitar todas as origens em desenvolvimento
- Em produção, ajuste o `CheckOrigin` em `cmd/server/main.go`

### Cliente não conecta
- Verifique se a URL do WebSocket está correta em `examples/client/src/App.jsx`
- Verifique o console do navegador para erros
