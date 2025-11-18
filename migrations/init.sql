-- Schema para o sistema de mensagens Go-Socket
-- Criado automaticamente na inicialização do PostgreSQL

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de mensagens persistidas
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    username VARCHAR(255),
    payload JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_messages_room_name ON messages(room_name);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_name, created_at DESC);

-- Índice GIN para busca no payload JSON
CREATE INDEX IF NOT EXISTS idx_messages_payload ON messages USING GIN (payload);

-- Tabela de métricas de rooms (opcional, para analytics)
CREATE TABLE IF NOT EXISTS room_stats (
    room_name VARCHAR(255) PRIMARY KEY,
    total_messages BIGINT DEFAULT 0,
    active_users INT DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar stats automaticamente
CREATE OR REPLACE FUNCTION update_room_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO room_stats (room_name, total_messages, last_activity)
    VALUES (NEW.room_name, 1, NEW.created_at)
    ON CONFLICT (room_name)
    DO UPDATE SET
        total_messages = room_stats.total_messages + 1,
        last_activity = NEW.created_at,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar stats
CREATE TRIGGER trigger_update_room_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_room_stats();

-- View para facilitar queries de histórico
CREATE OR REPLACE VIEW recent_messages AS
SELECT
    m.id,
    m.room_name,
    m.user_id,
    m.username,
    m.payload,
    m.metadata,
    m.created_at,
    rs.total_messages as room_total_messages
FROM messages m
LEFT JOIN room_stats rs ON m.room_name = rs.room_name
ORDER BY m.created_at DESC
LIMIT 1000;

-- Comentários para documentação
COMMENT ON TABLE messages IS 'Armazena todas as mensagens enviadas através do sistema pub/sub';
COMMENT ON TABLE room_stats IS 'Estatísticas agregadas por sala para analytics';
COMMENT ON COLUMN messages.payload IS 'Conteúdo da mensagem em formato JSON';
COMMENT ON COLUMN messages.metadata IS 'Metadados adicionais (timestamp, sala info, etc)';

-- Grant de permissões
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gosocket;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gosocket;
