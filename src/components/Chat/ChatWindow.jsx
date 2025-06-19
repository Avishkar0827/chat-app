"use client"

import { useState, useEffect, useRef } from "react"
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "../../firebase/config.js"
import Message from "./Message.jsx"

const ChatWindow = ({ selectedChat, currentUser }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!selectedChat) {
      setMessages([])
      return
    }

    const q = query(collection(db, "chats", selectedChat.id, "messages"), orderBy("createdAt", "asc"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesArray = []
      querySnapshot.forEach((doc) => {
        messagesArray.push({ ...doc.data(), id: doc.id })
      })
      setMessages(messagesArray)
    })

    return () => unsubscribe()
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newMessage.trim() === "" || !selectedChat) return

    setLoading(true)
    try {
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email,
        email: currentUser.email,
      })

      
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: newMessage,
        lastMessageTime: serverTimestamp(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, "chats", selectedChat.id, "messages", messageId))
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const handleEditMessage = async (messageId, newText) => {
    try {
      await updateDoc(doc(db, "chats", selectedChat.id, "messages", messageId), {
        text: newText,
        edited: true,
        editedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error editing message:", error)
    }
  }

  const getChatDisplayName = () => {
    if (!selectedChat) return ""

    if (selectedChat.type === "group") {
      return selectedChat.name
    } else {
      const otherParticipant = Object.values(selectedChat.participantDetails || {}).find(
        (p) => p.email !== currentUser.email,
      )
      return otherParticipant?.displayName || "Unknown User"
    }
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No chat selected</h3>
          <p className="text-gray-500">Choose a chat from the sidebar or start a new conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-300 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {selectedChat.type === "group" ? "👥" : "👤"}
          </div>
          <div>
            <h2 className="font-semibold">{getChatDisplayName()}</h2>
            <p className="text-sm text-gray-500">
              {selectedChat.type === "group" ? `${selectedChat.participants?.length || 0} members` : "Direct message"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onDelete={handleDeleteMessage}
            onEdit={handleEditMessage}
            showSenderName={selectedChat.type === "group"}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-300 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || newMessage.trim() === ""}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow
