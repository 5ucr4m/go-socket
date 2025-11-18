# Cliente WebSocket - Go-Socket

Interface de chat em tempo real construída com React, Vite e Tailwind CSS.

## 🚀 Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

O cliente estará disponível em `http://localhost:5173`

### 3. Build para produção
```bash
npm run build
```

Os arquivos otimizados estarão em `dist/`

## 🔌 Conexão com o Servidor

O cliente se conecta automaticamente ao servidor WebSocket em:
```
ws://localhost:8080/ws
```

Certifique-se de que o servidor Go está rodando antes de usar o cliente.

## 📦 Tecnologias Utilizadas

- **React** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **WebSocket API** - Comunicação em tempo real (nativa do navegador)

## 🎨 Funcionalidades

- ✅ Conexão WebSocket nativa (sem bibliotecas)
- ✅ Interface moderna com Tailwind CSS
- ✅ Indicador de status de conexão
- ✅ Sistema de mensagens em tempo real
- ✅ Auto-scroll para novas mensagens
- ✅ Timestamp em cada mensagem
- ✅ Tela de login com username
