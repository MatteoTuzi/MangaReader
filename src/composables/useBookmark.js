import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isConfigured } from '../firebase'

const STORAGE_KEY = 'mangareader-bookmarks'
const OLD_STORAGE_KEY = 'mangareader-bookmark'

function loadAllFromStorage() {
  try {
    let data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      const old = localStorage.getItem(OLD_STORAGE_KEY)
      if (old) {
        const parsed = JSON.parse(old)
        if (parsed.volumeNum) {
          const migrated = { onepiece: { ...parsed, mangaId: 'onepiece', updatedAt: parsed.updatedAt || new Date().toISOString() } }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
          return migrated
        }
      }
      return {}
    }
    const parsed = JSON.parse(data)
    if (parsed.volumeNum) return { onepiece: { ...parsed, mangaId: 'onepiece' } }
    return parsed
  } catch {
    return {}
  }
}

function loadFromStorage() {
  const all = loadAllFromStorage()
  return all
}

export function useBookmark() {
  async function load(mangaId) {
    const all = loadFromStorage()

    const getForManga = (id) => {
      const b = all[id]
      return b ? { ...b, mangaId: id } : null
    }

    const getMostRecent = () => {
      let latest = null
      for (const id of Object.keys(all)) {
        const b = all[id]
        if (!b) continue
        const t = b.updatedAt || '0'
        if (!latest || t > (latest.updatedAt || '0')) {
          latest = { ...b, mangaId: id }
        }
      }
      return latest
    }

    if (mangaId) {
      const local = getForManga(mangaId)
      if (isConfigured && auth?.currentUser) {
        try {
          const ref = doc(db, 'bookmarks', auth.currentUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const cloud = snap.data()
            const cloudBookmarks = cloud.bookmarks || {}
            const cloudB = cloudBookmarks[mangaId]
            if (cloudB) {
              const localTime = local?.updatedAt || '0'
              const cloudTime = cloudB.updatedAt || '0'
              return cloudTime >= localTime ? { ...cloudB, mangaId } : local
            }
          }
        } catch {}
      }
      return local
    }

    const local = getMostRecent()
    if (isConfigured && auth?.currentUser) {
      try {
        const ref = doc(db, 'bookmarks', auth.currentUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const cloud = snap.data()
          const cloudBookmarks = cloud.bookmarks || {}
          let latestCloud = null
          for (const id of Object.keys(cloudBookmarks)) {
            const b = cloudBookmarks[id]
            const t = b.updatedAt || '0'
            if (!latestCloud || t > (latestCloud.updatedAt || '0')) {
              latestCloud = { ...b, mangaId: id }
            }
          }
          if (latestCloud) {
            const localTime = local?.updatedAt || '0'
            const cloudTime = latestCloud.updatedAt || '0'
            return cloudTime >= localTime ? latestCloud : local
          }
        }
      } catch {}
    }
    return local
  }

  function save(bookmark) {
    const { mangaId, ...rest } = bookmark
    const id = mangaId || 'onepiece'
    const data = { ...rest, updatedAt: new Date().toISOString() }

    const all = loadFromStorage()
    all[id] = data

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch (e) {
      console.warn('Bookmark save failed:', e)
    }

    if (isConfigured && auth?.currentUser) {
      const uid = auth.currentUser.uid
      getDoc(doc(db, 'bookmarks', uid)).then(snap => {
        const current = snap.exists() ? snap.data() : {}
        const bookmarks = { ...(current.bookmarks || {}), [id]: { ...data, mangaId: id } }
        setDoc(doc(db, 'bookmarks', uid), {
          bookmarks,
          userId: uid,
          userEmail: auth.currentUser.email,
          updatedAt: new Date().toISOString()
        }).catch(() => {})
      })
    }
  }

  return { save, load }
}
