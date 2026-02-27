import { ref } from 'vue'
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { auth, db, isConfigured } from '../firebase'
import defaultManga from '../data/chapters.json'

const DEFAULT_MANGA_ID = 'onepiece'

const defaultMangaEntry = {
  id: DEFAULT_MANGA_ID,
  title: defaultManga.mangaTitle || 'One Piece Volumi Colored',
  baseUrl: defaultManga.baseUrl,
  urlPattern: 'volume',
  volumes: defaultManga.volumes,
  isDefault: true
}

const mangaList = ref([defaultMangaEntry])

export function useMangaLibrary() {
  async function loadManga() {
    if (!isConfigured || !db) {
      mangaList.value = [defaultMangaEntry]
      return
    }
    try {
      const q = query(collection(db, 'manga'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const fromFirestore = snap.docs.map(d => ({ id: d.id, ...d.data(), isDefault: false }))
      mangaList.value = [defaultMangaEntry, ...fromFirestore]
    } catch (e) {
      mangaList.value = [defaultMangaEntry]
    }
  }

  async function addManga(manga) {
    if (!isConfigured || !db) return null
    try {
      const doc = {
        title: manga.title,
        baseUrl: manga.baseUrl,
        urlPattern: manga.urlPattern || 'volume',
        volumes: manga.volumes,
        createdAt: new Date().toISOString(),
        createdBy: auth?.currentUser?.uid || null
      }
      if (manga.mangaSlug) doc.mangaSlug = manga.mangaSlug
      if (manga.pageFormat) doc.pageFormat = manga.pageFormat
      const docRef = await addDoc(collection(db, 'manga'), doc)
      await loadManga()
      return docRef.id
    } catch (e) {
      console.error('Add manga failed:', e)
      throw e
    }
  }

  async function deleteManga(id) {
    if (!isConfigured || !db || id === DEFAULT_MANGA_ID) return
    try {
      await deleteDoc(doc(db, 'manga', id))
      await loadManga()
    } catch (e) {
      console.error('Delete manga failed:', e)
      throw e
    }
  }

  function getManga(id) {
    if (id === DEFAULT_MANGA_ID) return defaultMangaEntry
    return mangaList.value.find(m => m.id === id) || null
  }

  return {
    mangaList,
    loadManga,
    addManga,
    deleteManga,
    getManga,
    DEFAULT_MANGA_ID
  }
}
