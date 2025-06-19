"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { auth, db } from "../firebase/config"
import { onAuthStateChanged } from "firebase/auth"
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Update user presence in Firestore
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              uid: user.uid,
              displayName: user.displayName || user.email,
              email: user.email,
              photoURL: user.photoURL || null,
              isOnline: true,
              lastSeen: serverTimestamp(),
            },
            { merge: true },
          )
        } catch (error) {
          console.error("Error updating user presence:", error)
        }
      }
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Handle user going offline
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentUser) {
        try {
          await updateDoc(doc(db, "users", currentUser.uid), {
            isOnline: false,
            lastSeen: serverTimestamp(),
          })
        } catch (error) {
          console.error("Error updating offline status:", error)
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [currentUser])

  const value = {
    currentUser,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
