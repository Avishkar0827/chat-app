"use client"

import { useState } from "react"
import { useAuth } from "../../Contexts/AuthContext.jsx"
import ChatSidebar from "./ChatSidebar.jsx"
import ChatWindow from "./ChatWindow.jsx"

const ChatRoom = () => {
  const [selectedChat, setSelectedChat] = useState(null)
  const { currentUser } = useAuth()

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar selectedChat={selectedChat} onSelectChat={setSelectedChat} />
      <ChatWindow selectedChat={selectedChat} currentUser={currentUser} />
    </div>
  )
}

export default ChatRoom
