import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isConfigured } from '../firebase'

const STORAGE_KEY = 'mangareader-bookmark'

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function useBookmark() {
  async function load() {
    // Sempre disponibile: localStorage (funziona senza login)
    const local = loadFromStorage()

    // Se loggato, prova a caricare da Firestore (sync multi-dispositivo)
    if (isConfigured && auth?.currentUser) {
      try {
        const ref = doc(db, 'bookmarks', auth.currentUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const cloud = snap.data()
          // Preferisci il più recente tra locale e cloud
          const localTime = local?.updatedAt || '0'
          const cloudTime = cloud?.updatedAt || '0'
          return cloudTime >= localTime ? cloud : local
        }
      } catch {
        // Fallback a localStorage se Firestore fallisce
      }
    }

    return local
  }

  function save(bookmark) {
    const data = { ...bookmark, updatedAt: new Date().toISOString() }

    // Sempre salva in localStorage (funziona senza login)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Bookmark save failed:', e)
    }

    // Se loggato, sincronizza anche su Firestore
    if (isConfigured && auth?.currentUser) {
      const uid = auth.currentUser.uid
      setDoc(doc(db, 'bookmarks', uid), {
        ...data,
        userId: uid,
        userEmail: auth.currentUser.email
      }).catch(() => {})
    }
  }

  return { save, load }
}
