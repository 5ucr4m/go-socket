import { FormEvent, useState, memo } from 'react'
import { useUserStore } from '../../stores'

export const LoginView = memo(() => {
  const [username, setUsername] = useState('')
  const { username: savedUsername, login } = useUserStore()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const finalUsername = username || savedUsername

    if (finalUsername.trim()) {
      login(finalUsername.trim())
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎮 Go-Socket</h1>
          <p className="text-gray-600">Sistema de Chat com Pub/Sub e Presence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Escolha seu nome de usuário
            </label>
            <input
              id="username"
              type="text"
              value={username || savedUsername}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={savedUsername ? `Bem-vindo de volta, ${savedUsername}!` : "Digite seu nome..."}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition"
              autoFocus
            />
            {savedUsername && (
              <p className="mt-2 text-xs text-gray-500">
                💡 Deixe em branco para usar: <strong>{savedUsername}</strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!username.trim() && !savedUsername}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {savedUsername ? 'Entrar Novamente' : 'Entrar no Chat'}
          </button>
        </form>
      </div>
    </div>
  )
})

LoginView.displayName = 'LoginView'
