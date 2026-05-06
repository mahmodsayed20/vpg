import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, ADMIN_EMAIL } from '@/lib/firebase'
import { useStore } from '@/store'

export function useAuth() {
  const { setUser, setAuthReady } = useStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        setUser({
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName,
          photoURL:    user.photoURL,
          isAdmin:     user.email === ADMIN_EMAIL,
        })
      } else {
        setUser(null)
      }
      setAuthReady(true)
    })
    return unsub
  }, [])
}
