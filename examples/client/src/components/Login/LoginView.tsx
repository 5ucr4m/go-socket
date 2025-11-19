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
    <div className="min-h-screen login-gradient flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {/* App Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-400 rounded-3xl flex items-center justify-center shadow-lg mb-4 transform hover:scale-105 transition-transform">
            <span className="text-4xl">💬</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Go-Socket Chat
          </h1>
          <p className="text-gray-500 text-sm">
            Entre e comece a conversar com seus amigos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
              Nome de usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-400 text-lg">👤</span>
              </div>
              <input
                id="username"
                type="text"
                value={username || savedUsername}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={savedUsername ? savedUsername : "Digite seu nome..."}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 placeholder-gray-400"
                autoFocus
              />
            </div>
            {savedUsername && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">💡</span>
                <p className="text-xs text-purple-700 flex-1">
                  Bem-vindo de volta! Deixe em branco para entrar como <strong>{savedUsername}</strong>
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!username.trim() && !savedUsername}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {savedUsername ? '✨ Entrar Novamente' : '🚀 Começar a Conversar'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Powered by Go + WebSocket + React
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Mensagens em tempo real
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Status online
            </span>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600"></div>
    </div>
  )
})

LoginView.displayName = 'LoginView'
