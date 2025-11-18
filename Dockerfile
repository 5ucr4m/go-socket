# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Build
FROM golang:1.24-alpine AS builder

# Instala dependências necessárias para build
RUN apk add --no-cache git

WORKDIR /build

# Copia arquivos de dependências primeiro (para cache de layers)
COPY go.mod go.sum ./
RUN go mod download

# Copia o código fonte
COPY . .

# Build do servidor
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Build do worker
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o worker ./cmd/worker

# Stage 2: Runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copia os binários do stage de build
COPY --from=builder /build/server .
COPY --from=builder /build/worker .

# Copia arquivos estáticos se existirem
COPY --from=builder /build/examples/client/dist ./examples/client/dist 2>/dev/null || true

# Expõe a porta do servidor (configurável via env)
EXPOSE 8080

# Por padrão, executa o servidor
# Pode ser sobrescrito no docker-compose para executar o worker
CMD ["/app/server"]
