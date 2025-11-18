# Cliente WebSocket - Go-Socket

Interface de chat em tempo real construída com React, TypeScript, Vite e Tailwind CSS v4.

## 🚀 Como Executar

### 1. Instalar dependências
```bash
bun install
```

### 2. Iniciar o servidor de desenvolvimento
```bash
bun run dev
```

O cliente estará disponível em `http://localhost:5173`

### 3. Build para produção
```bash
bun run build
```

Os arquivos otimizados estarão em `dist/`

### 4. Type checking
```bash
bun run type-check
```

## 🔌 Conexão com o Servidor

O cliente se conecta automaticamente ao servidor WebSocket em:
```
ws://localhost:8080/ws
```

Certifique-se de que o servidor Go está rodando antes de usar o cliente.

## 📦 Tecnologias Utilizadas

- **React 19** - Framework UI
- **TypeScript 5** - Type safety
- **Vite 7** - Build tool ultra-rápido
- **Tailwind CSS v4** - Estilização moderna (nova engine CSS)
- **Bun** - Package manager e runtime JavaScript
- **WebSocket API** - Comunicação em tempo real (nativa do navegador)

## 🎨 Funcionalidades

- ✅ Conexão WebSocket nativa (sem bibliotecas)
- ✅ Interface moderna com Tailwind CSS
- ✅ Indicador de status de conexão
- ✅ Sistema de mensagens em tempo real
- ✅ Auto-scroll para novas mensagens
- ✅ Timestamp em cada mensagem
- ✅ Tela de login com username
