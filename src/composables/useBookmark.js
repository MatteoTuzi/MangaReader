import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isConfigured } from '../firebase'

const STORAGE_KEY = 'mangareader-bookmark'

export function useBookmark() {
  async function load() {
    try {
      if (isConfigured && auth?.currentUser) {
        const ref = doc(db, 'bookmarks', auth.currentUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) return snap.data()
      }
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch (e) {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    }
  }

  function save(bookmark) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmark))
      if (isConfigured && auth?.currentUser) {
        setDoc(doc(db, 'bookmarks', auth.currentUser.uid), {
          ...bookmark,
          updatedAt: new Date().toISOString()
        }).catch(() => {})
      }
    } catch (e) {
      console.warn('Bookmark save failed:', e)
    }
  }

  return { save, load }
}
