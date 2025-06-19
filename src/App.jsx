"use client"

import { AuthProvider, useAuth } from "./Contexts/AuthContext.jsx"
import AuthWrapper from "./components/Auth/AuthWrapper.jsx"
import ChatRoom from "./components/Chat/ChatRoom.jsx"
import "./App.css"

function AppContent() {
  const { currentUser } = useAuth()

  return <div className="App">{currentUser ? <ChatRoom /> : <AuthWrapper />}</div>
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
