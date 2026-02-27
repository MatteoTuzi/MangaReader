import { ref } from 'vue'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, GoogleAuthProvider, isConfigured } from '../firebase'

const user = ref(null)
if (auth) {
  auth.onAuthStateChanged((u) => { user.value = u })
}

export function useAuth() {

  async function loginWithGoogle() {
    if (!auth) return
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      console.error('Login failed:', e)
      throw e
    }
  }

  async function logout() {
    if (!auth) return
    await signOut(auth)
  }

  return {
    user,
    isConfigured,
    loginWithGoogle,
    logout
  }
}
