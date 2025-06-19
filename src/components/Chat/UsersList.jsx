"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "../../firebase/config.js"

const UsersList = () => {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const q = query(collection(db, "users"), where("isOnline", "==", true))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersArray = []
      querySnapshot.forEach((doc) => {
        usersArray.push({ ...doc.data(), id: doc.id })
      })
      setUsers(usersArray)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Online Users</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">{user.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UsersList
