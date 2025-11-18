package config

import (
	"os"
	"strconv"
	"time"
)

// Config armazena todas as configurações da aplicação
type Config struct {
	// Server
	ServerPort string
	InstanceID string

	// Redis
	RedisURL string

	// PostgreSQL
	PostgresURL string

	// Worker
	WorkerEnabled bool
	WorkerID      string
	BatchSize     int
	BatchTimeout  time.Duration
}

// Load carrega as configurações das variáveis de ambiente
func Load() *Config {
	return &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		InstanceID:    getEnv("INSTANCE_ID", "server-local"),
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		PostgresURL:   getEnv("POSTGRES_URL", "postgres://gosocket:gosocket123@localhost:5432/gosocket?sslmode=disable"),
		WorkerEnabled: getEnvBool("WORKER_ENABLED", false),
		WorkerID:      getEnv("WORKER_ID", "worker-local"),
		BatchSize:     getEnvInt("BATCH_SIZE", 100),
		BatchTimeout:  getEnvDuration("BATCH_TIMEOUT", 5*time.Second),
	}
}

// getEnv retorna o valor de uma variável de ambiente ou um valor padrão
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvBool retorna um booleano de uma variável de ambiente
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}

// getEnvInt retorna um inteiro de uma variável de ambiente
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

// getEnvDuration retorna uma duration de uma variável de ambiente
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if d, err := time.ParseDuration(value); err == nil {
			return d
		}
	}
	return defaultValue
}
