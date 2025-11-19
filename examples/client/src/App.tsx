import { useUserStore } from './stores'
import { LoginView, ChatView } from './components'
import './App.css'

function App() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)

  return isLoggedIn ? <ChatView /> : <LoginView />
}

export default App
