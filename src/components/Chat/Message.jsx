"use client"

import { useState } from "react"

const Message = ({ message, currentUser, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.text)
  const [showActions, setShowActions] = useState(false)

  const isOwnMessage = message.uid === currentUser.uid

  const handleEdit = () => {
    if (editText.trim() !== message.text) {
      onEdit(message.id, editText.trim())
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
    if (e.key === "Escape") {
      setIsEditing(false)
      setEditText(message.text)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = timestamp.toDate()
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage ? "bg-blue-500 text-white" : "bg-white text-gray-800 border border-gray-300"
        }`}
      >
        {!isOwnMessage && <div className="text-xs font-semibold mb-1 text-gray-600">{message.displayName}</div>}

        {isEditing ? (
          <div>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyPress={handleKeyPress}
              onBlur={handleEdit}
              className="w-full px-2 py-1 text-gray-800 border rounded"
              autoFocus
            />
            <div className="text-xs mt-1 text-gray-500">Press Enter to save, Escape to cancel</div>
          </div>
        ) : (
          <div>
            <div className="break-words">{message.text}</div>
            {message.edited && (
              <div className={`text-xs mt-1 ${isOwnMessage ? "text-blue-200" : "text-gray-500"}`}>(edited)</div>
            )}
          </div>
        )}

        <div className={`text-xs mt-1 ${isOwnMessage ? "text-blue-200" : "text-gray-500"}`}>
          {formatTime(message.createdAt)}
        </div>

        {/* Action buttons */}
        {showActions && isOwnMessage && !isEditing && (
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs px-2 py-1 bg-white text-blue-500 rounded hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="text-xs px-2 py-1 bg-white text-red-500 rounded hover:bg-gray-100"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
