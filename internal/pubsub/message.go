package pubsub

import "encoding/json"

// Message representa a estrutura padrão de todas as mensagens WebSocket
// Todos os campos podem ser string ou JSON serializado como string
type Message struct {
	// Payload contém os dados principais da mensagem
	// Pode ser uma string simples ou um JSON serializado como string
	Payload json.RawMessage `json:"payload"`

	// User contém informações do usuário (opcional)
	// Pode ser uma string simples ou um JSON serializado como string
	User json.RawMessage `json:"user,omitempty"`

	// Metadata contém informações adicionais (opcional)
	// Pode ser uma string simples ou um JSON serializado como string
	Metadata json.RawMessage `json:"metadata,omitempty"`
}

// ToJSON converte a mensagem para JSON bytes
func (m *Message) ToJSON() ([]byte, error) {
	return json.Marshal(m)
}

// FromJSON cria uma Message a partir de JSON bytes
func FromJSON(data []byte) (*Message, error) {
	var msg Message
	err := json.Unmarshal(data, &msg)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}
