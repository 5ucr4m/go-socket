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
├── cmd/server/          # Aplicação principal
├── internal/pubsub/     # Lógica interna do pub-sub
├── pkg/gosocket/        # Biblioteca pública
└── examples/            # Exemplos de uso
```

## 🚀 Como Executar

```bash
# Instalar dependências
go mod download

# Executar o servidor
go run cmd/server/main.go
```

## 📖 Aprendizado

Este projeto será desenvolvido em etapas, cada uma focando em conceitos específicos de Go:

1. ✅ Inicialização do projeto e estrutura
2. Tipos básicos e structs
3. Goroutines e channels
4. WebSockets
5. Sistema Pub-Sub
6. Multiplexação de eventos

## 📝 Licença

MIT
