"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { db, auth } from "../../firebase/config.js"
import { useAuth } from "../../Contexts/AuthContext.jsx"

const ChatSidebar = ({ selectedChat, onSelectChat }) => {
  const [users, setUsers] = useState([])
  const [chats, setChats] = useState([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    chatId: null,
    chatName: ""
  })
  const { currentUser } = useAuth()

  // Listen to all users
  useEffect(() => {
    if (!currentUser) {
      console.log("No current user, skipping users listener")
      return
    }

    console.log("Current user:", currentUser.uid, currentUser.email)
    console.log("Setting up users listener...")

    const q = query(collection(db, "users"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("Users snapshot received, size:", querySnapshot.size)
        const usersArray = []
        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          console.log("User document:", doc.id, userData)
          if (userData.uid !== currentUser.uid) {
            usersArray.push({ ...userData, id: doc.id })
          }
        })
        console.log("Filtered users array:", usersArray)
        setUsers(usersArray)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error("Error listening to users:", error)
        setError(error.message)
        setLoading(false)
      },
    )

    return () => {
      console.log("Cleaning up users listener")
      unsubscribe()
    }
  }, [currentUser])

  // Listen to user's chats
  useEffect(() => {
    if (!currentUser) return

    console.log("Setting up chats listener...")
    const q = query(collection(db, "chats"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("Chats snapshot received, size:", querySnapshot.size)
        const chatsArray = []
        querySnapshot.forEach((doc) => {
          const chatData = doc.data()
          console.log("Chat document:", doc.id, chatData)
          if (chatData.participants && chatData.participants.includes(currentUser.uid)) {
            chatsArray.push({ ...chatData, id: doc.id })
          }
        })
        chatsArray.sort((a, b) => {
          const aTime = a.lastMessageTime?.toDate() || new Date(0)
          const bTime = b.lastMessageTime?.toDate() || new Date(0)
          return bTime - aTime
        })
        console.log("Filtered chats array:", chatsArray)
        setChats(chatsArray)
      },
      (error) => {
        console.error("Error listening to chats:", error)
      },
    )

    return () => unsubscribe()
  }, [currentUser])

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        })
      }
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const startDirectChat = async (otherUser) => {
    console.log("Starting direct chat with:", otherUser)
    try {
      const existingChatQuery = query(collection(db, "chats"))
      const existingChats = await getDocs(existingChatQuery)
      let existingDirectChat = null

      existingChats.forEach((doc) => {
        const chatData = doc.data()
        if (
          chatData.type === "direct" &&
          chatData.participants &&
          chatData.participants.includes(currentUser.uid) &&
          chatData.participants.includes(otherUser.uid) &&
          chatData.participants.length === 2
        ) {
          existingDirectChat = { ...chatData, id: doc.id }
        }
      })

      if (existingDirectChat) {
        console.log("Found existing chat:", existingDirectChat)
        onSelectChat(existingDirectChat)
        return
      }

      const newChat = {
        type: "direct",
        participants: [currentUser.uid, otherUser.uid],
        participantDetails: {
          [currentUser.uid]: {
            displayName: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            photoURL: currentUser.photoURL || null,
          },
          [otherUser.uid]: {
            displayName: otherUser.displayName || otherUser.email,
            email: otherUser.email,
            photoURL: otherUser.photoURL || null,
          },
        },
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "chats"), newChat)
      const createdChat = { ...newChat, id: docRef.id }
      console.log("Created new chat:", createdChat)
      onSelectChat(createdChat)
    } catch (error) {
      console.error("Error creating direct chat:", error)
    }
  }

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return

    try {
      const participants = [currentUser.uid, ...selectedUsers.map((u) => u.uid)]
      const participantDetails = {
        [currentUser.uid]: {
          displayName: currentUser.displayName || currentUser.email,
          email: currentUser.email,
          photoURL: currentUser.photoURL || null,
        },
      }

      selectedUsers.forEach((user) => {
        participantDetails[user.uid] = {
          displayName: user.displayName || user.email,
          email: user.email,
          photoURL: user.photoURL || null,
        }
      })

      const newGroupChat = {
        type: "group",
        name: groupName.trim(),
        participants,
        participantDetails,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "chats"), newGroupChat)
      onSelectChat({ ...newGroupChat, id: docRef.id })

      setGroupName("")
      setSelectedUsers([])
      setShowCreateGroup(false)
    } catch (error) {
      console.error("Error creating group chat:", error)
    }
  }

  const deleteGroupChat = async () => {
    if (!confirmDelete.chatId) return
    
    try {
      const chatToDelete = chats.find(chat => chat.id === confirmDelete.chatId)
      if (!chatToDelete || chatToDelete.createdBy !== currentUser.uid) {
        alert("Only the group creator can delete this group")
        return
      }

      await deleteDoc(doc(db, "chats", confirmDelete.chatId))
      
      if (selectedChat?.id === confirmDelete.chatId) {
        onSelectChat(null)
      }
      
      setConfirmDelete({ show: false, chatId: null, chatName: "" })
    } catch (error) {
      console.error("Error deleting group chat:", error)
      alert("Failed to delete group")
    }
  }

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u.uid === user.uid)
      if (isSelected) {
        return prev.filter((u) => u.uid !== user.uid)
      } else {
        return [...prev, user]
      }
    })
  }

  const getChatDisplayName = (chat) => {
    if (chat.type === "group") {
      return chat.name
    } else {
      const otherParticipant = Object.values(chat.participantDetails || {}).find((p) => p.email !== currentUser.email)
      return otherParticipant?.displayName || "Unknown User"
    }
  }

  const getChatLastMessage = (chat) => {
    return chat.lastMessage || "No messages yet"
  }

  if (!currentUser) {
    return <div className="w-80 bg-white border-r border-gray-300 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="w-80 bg-white border-r border-gray-300 flex flex-col h-full">
      {/* Confirmation Dialog */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Group</h3>
            <p className="mb-4">Are you sure you want to delete "{confirmDelete.chatName}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete({ show: false, chatId: null, chatName: "" })}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={deleteGroupChat}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦜 </span>
            <h2 className="text-xl font-semibold text-gray-800">YapYap</h2>
          </div>
          <button onClick={handleLogout} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
            Logout
          </button>
        </div>
        <p className="text-sm text-gray-600">Welcome, {currentUser?.displayName || currentUser?.email}</p>

        {/* Create Group Button */}
        <button
          onClick={() => setShowCreateGroup(!showCreateGroup)}
          className="mt-3 w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateGroup ? "Cancel" : "Create Group Chat"}
        </button>
      </div>

      {/* Create Group Form */}
      {showCreateGroup && (
        <div className="p-4 border-b border-gray-300 bg-gray-50">
          <input
            type="text"
            placeholder="Group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
          />
          <div className="text-sm font-medium mb-2">Select users:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {users.map((user) => (
              <label key={user.uid} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUsers.find((u) => u.uid === user.uid) !== undefined}
                  onChange={() => toggleUserSelection(user)}
                  className="rounded"
                />
                <span className="text-sm">{user.displayName}</span>
                <div className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-green-500" : "bg-gray-400"}`}></div>
              </label>
            ))}
          </div>
          <button
            onClick={createGroupChat}
            disabled={!groupName.trim() || selectedUsers.length === 0}
            className="mt-3 w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Create Group
          </button>
        </div>
      )}

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Chats</h3>
          {chats.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No chats yet</div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id ? "bg-blue-100" : "hover:bg-gray-100"
                  }`}
                >
                  <div onClick={() => onSelectChat(chat)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          {chat.type === "group" ? "👥" : "👤"}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{getChatDisplayName(chat)}</div>
                          <div className="text-xs text-gray-500 truncate">{getChatLastMessage(chat)}</div>
                        </div>
                      </div>
                      {chat.type === "group" && (
                        <div className="text-xs text-gray-400">{chat.participants?.length} members</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete button for group chats */}
                  {chat.type === "group" && chat.createdBy === currentUser.uid && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete({
                            show: true,
                            chatId: chat.id,
                            chatName: chat.name
                          })
                        }}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete Group
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="p-4 border-t border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Users ({users.length})</h3>

          {error && <div className="text-xs text-red-500 mb-2 p-2 bg-red-50 rounded">Error: {error}</div>}

          {loading ? (
            <div className="text-sm text-gray-500 text-center py-4">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              <div>No other users found</div>
              <div className="text-xs mt-1">Current user: {currentUser?.email}</div>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.uid}
                  onClick={() => startDirectChat(user)}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-100 cursor-pointer border border-gray-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${user.isOnline ? "bg-green-500" : "bg-gray-400"}`}></div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{user.displayName || user.email}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{user.isOnline ? "Online" : "Offline"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatSidebar