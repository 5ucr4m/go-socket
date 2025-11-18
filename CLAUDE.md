# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go-Socket is an educational project implementing a pub-sub (publisher-subscriber) real-time communication system in Go, similar to Socket.IO. The project consists of:
- Go WebSocket server using gorilla/websocket
- React/TypeScript client with Tailwind CSS v4
- Hub-based architecture with goroutines and channels

## Build and Run Commands

### Server (Go)
```bash
# Run directly
go run cmd/server/main.go

# Build and run
go build -o bin/server ./cmd/server
./bin/server
```

Server runs on http://localhost:8080 with WebSocket endpoint at ws://localhost:8080/ws

### Client (React)
```bash
cd examples/client

# Install dependencies (first time)
npm install

# Development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Lint
npm run lint
```

Client runs on http://localhost:5173

## Architecture

### Hub Pattern (Core Concept)
The server uses a **Hub pattern** where a central `Hub` struct manages all client connections and message broadcasting:

- `Hub` (`internal/pubsub/hub.go`): Central coordinator running in its own goroutine, uses `select` to multiplex between three channels:
  - `register chan *Client`: Add new clients
  - `unregister chan *Client`: Remove disconnected clients
  - `broadcast chan []byte`: Messages to broadcast to all clients

- `Client` (`internal/pubsub/client.go`): Each WebSocket connection gets:
  - `readPump()`: Dedicated goroutine reading from WebSocket, sends messages to hub's broadcast channel
  - `writePump()`: Dedicated goroutine writing to WebSocket from client's send channel
  - `send chan []byte`: Buffered channel (256) for outbound messages

### Connection Flow
1. HTTP request to `/ws` → Upgrade to WebSocket (`cmd/server/main.go:21-38`)
2. Create `Client` with `pubsub.NewClient()` → Send to `Hub.register` channel
3. Hub's `Run()` goroutine adds client to `clients map[*Client]bool`
4. Start `go client.WritePump()` and `go client.ReadPump()`
5. Messages flow: Client WebSocket → `ReadPump` → `hub.broadcast` → Hub distributes → each `Client.send` → `WritePump` → Client WebSocket

### Goroutine Organization
- 1 goroutine for `Hub.Run()` (entire server lifetime)
- 2 goroutines per client: `ReadPump()` and `WritePump()`
- Clean shutdown via `defer` in pump methods: unregister from hub, close connection

### WebSocket Configuration
Key constants in `internal/pubsub/client.go:10-22`:
- `writeWait`: 10s timeout for writes
- `pongWait`: 60s timeout for pong responses
- `pingPeriod`: 54s (9/10 of pongWait) - automatic ping/pong keep-alive
- `maxMessageSize`: 512 bytes

CORS is currently wide open (`CheckOrigin: func(r *http.Request) bool { return true }`) in `cmd/server/main.go:15-17` - tighten for production.

## Current Implementation State

**Completed:**
- Basic WebSocket server with HTTP upgrade
- Hub managing multiple concurrent connections
- Broadcast messaging (all messages go to all clients)
- Goroutine-based concurrency model
- Ping/Pong keep-alive mechanism
- Client disconnect handling
- React client with TypeScript and Tailwind v4

**Not Yet Implemented:**
- Event multiplexing (typed events like Socket.IO)
- Rooms/channels for grouped messaging
- Direct/private messaging between clients
- Message persistence
- Authentication/authorization
- Tests

## Development Patterns

### Adding New Message Types
Currently all messages are `[]byte` broadcast to everyone. To add typed events:
1. Define message structure (likely JSON with type field)
2. Update `Hub.broadcast` to handle routing based on message type
3. Consider adding `Hub.rooms` map for channel-based routing
4. Update `Client.ReadPump()` to parse message structure

### Working with Goroutines
- Always close channels when goroutines exit (see `Hub.Run()` unregister case)
- Use `select` with `default` case for non-blocking channel sends (see broadcast loop in `hub.go:54-60`)
- Set timeouts on WebSocket operations to prevent goroutine leaks

### Client Changes
The React client uses native WebSocket API (no socket.io-client). When modifying:
- WebSocket connection logic is in `examples/client/src/App.tsx`
- Uses Bun as package manager (note: package.json shows npm scripts but project may use bun)
- Tailwind v4 configuration in use

## File Organization

```
cmd/server/main.go           # HTTP server, WebSocket upgrade, route handlers
internal/pubsub/hub.go       # Hub struct, client management, broadcast logic
internal/pubsub/client.go    # Client struct, ReadPump/WritePump, WebSocket I/O
examples/client/src/         # React TypeScript client
pkg/gosocket/                # Future: public library API (currently empty)
```

Use `internal/` for server-only code (not importable by external packages). Use `pkg/` for reusable library code meant to be imported externally.
