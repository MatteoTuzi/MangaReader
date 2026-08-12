<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMangaLibrary } from '../composables/useMangaLibrary'
import { useBookmark } from '../composables/useBookmark'

const route = useRoute()
const router = useRouter()
const { getManga, loadManga } = useMangaLibrary()
const { save: saveBookmark, load: loadBookmark } = useBookmark()
const mangaId = ref(route.params.mangaId)
const manga = ref(null)
const volumeNum = ref('')
const chapterNum = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const pages = ref([])
const loading = ref(true)
const error = ref(null)

const baseUrl = computed(() => manga.value?.baseUrl || '')

/** Trova il capitolo corrente nei volumi per ottenere chapterId/volumeId (pattern chapterId) */
const currentChapterData = computed(() => {
  const m = manga.value
  if (!m?.volumes) return null
  const vol = m.volumes.find(v => String(v.number).padStart(3, '0') === String(volumeNum.value).padStart(3, '0'))
  if (!vol?.chapters) return null
  return vol.chapters.find(c => String(c.num) === String(chapterNum.value)) || null
})

const nextChapterRoute = computed(() => {
  const volumes = manga.value?.volumes || []
  if (!volumes.length) return null

  const currentVolumeNormalized = (String(volumeNum.value).replace(/^0+/, '') || '0')
  const currentVolumeIndex = volumes.findIndex(v => (String(v.number).replace(/^0+/, '') || '0') === currentVolumeNormalized)
  if (currentVolumeIndex === -1) return null

  const currentVolume = volumes[currentVolumeIndex]
  const chapters = currentVolume?.chapters || []
  const currentChapterIndex = chapters.findIndex(c => String(c.num) === String(chapterNum.value))
  if (currentChapterIndex === -1) return null

  const nextInCurrentVolume = chapters[currentChapterIndex + 1]
  if (nextInCurrentVolume) {
    return {
      mangaId: mangaId.value,
      volumeNum: String(currentVolume.number).padStart(3, '0'),
      chapterNum: String(nextInCurrentVolume.num)
    }
  }

  const nextVolume = volumes[currentVolumeIndex + 1]
  const firstChapterInNextVolume = nextVolume?.chapters?.[0]
  if (!nextVolume || !firstChapterInNextVolume) return null

  return {
    mangaId: mangaId.value,
    volumeNum: String(nextVolume.number).padStart(3, '0'),
    chapterNum: String(firstChapterInNextVolume.num)
  }
})

function getImageUrl(page) {
  const base = baseUrl.value
  const pageStr = String(page).padStart(2, '0')
  const pattern = manga.value?.urlPattern || 'volume'

  if (pattern === 'reader') {
    return `${base}/reader/${chapterNum.value}/${pageStr}.jpg`
  }

  if (pattern === 'chapterId') {
    const ch = currentChapterData.value
    const vol = manga.value?.volumes?.find(v => String(v.number).padStart(3, '0') === String(volumeNum.value).padStart(3, '0'))
    if (!ch?.chapterId || !vol?.volumeId || !manga.value?.mangaSlug) return ''
    const mangaSlug = manga.value.mangaSlug
    const volNum = (String(volumeNum.value).replace(/^0+/, '') || '0').padStart(2, '0')
    const chNum = String(chapterNum.value).padStart(4, '0')
    const chapterSlugPrefix = manga.value.chapterSlugPrefix || 'capitolo'
    const pageFmt = manga.value?.pageFormat !== 'padded' ? String(page) : String(page).padStart(2, '0')
    return `${base}/${mangaSlug}/volume-${volNum}-${vol.volumeId}/${chapterSlugPrefix}-${chNum}-${ch.chapterId}/${pageFmt}.jpg`
  }

  const vol = String(volumeNum.value).padStart(3, '0')
  const chapterFolder = (String(chapterNum.value).replace(/^0+/, '') || '0').padStart(2, '0')
  return `${base}/volume${vol}/capitolo${chapterFolder}/${pageStr}.jpg`
}

const BATCH_SIZE = 10

const checkPage = (p) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = getImageUrl(p)
  })
}

async function discoverPages() {
  const discovered = []
  let start = 1
  const maxPages = 500

  while (start <= maxPages) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, i) => start + i)
    const results = await Promise.all(batch.map(checkPage))
    let lastValid = -1
    for (let i = 0; i < results.length; i++) {
      if (results[i]) lastValid = i
      else break
    }
    for (let i = 0; i <= lastValid; i++) discovered.push(batch[i])
    if (lastValid < BATCH_SIZE - 1) break
    start += BATCH_SIZE
  }

  return discovered
}

function preloadPages(fromPage) {
  for (let i = 0; i < BATCH_SIZE; i++) {
    const p = fromPage + i
    if (p <= totalPages.value) {
      const img = new Image()
      img.src = getImageUrl(p)
    }
  }
}

onMounted(async () => {
  mangaId.value = route.params.mangaId
  await loadManga()
  manga.value = getManga(mangaId.value)
  volumeNum.value = route.params.volumeNum
  chapterNum.value = route.params.chapterNum
  loading.value = true
  error.value = null

  if (!manga.value?.baseUrl) {
    error.value = 'Manga non trovato'
    loading.value = false
    return
  }

  if (manga.value?.urlPattern === 'chapterId' && !currentChapterData.value) {
    error.value = 'Capitolo non trovato (manca chapterId nel JSON)'
    loading.value = false
    return
  }

  try {
    const p = await discoverPages()
    pages.value = p
    totalPages.value = p.length
    if (totalPages.value === 0) {
      error.value = 'Nessuna pagina trovata per questo capitolo'
    } else {
      const vol = String(volumeNum.value).padStart(3, '0')
      const ch = String(chapterNum.value)
      const pageFromQuery = route.query.page ? parseInt(route.query.page, 10) : null
      const bookmark = await loadBookmark(mangaId.value)
      const bookmarkPage = (bookmark?.volumeNum === vol && bookmark?.chapterNum === ch) ? bookmark.page : null
      const initialPage = Math.min(Math.max(1, pageFromQuery ?? bookmarkPage ?? 1), totalPages.value)
      currentPage.value = initialPage
    }
  } catch (e) {
    error.value = 'Errore nel caricamento delle pagine'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKeydown)
})

function getChapterTitle() {
  const ch = String(chapterNum.value)
  return manga.value?.volumes?.flatMap(v => v.chapters || []).find(c => String(c.num) === ch)?.title
}

watch(currentPage, () => {
  if (totalPages.value > 0) {
    preloadPages(currentPage.value + 1)
    const vol = String(volumeNum.value).padStart(3, '0')
    const ch = String(chapterNum.value)
    saveBookmark({ mangaId: mangaId.value, volumeNum: vol, chapterNum: ch, page: currentPage.value, chapterTitle: getChapterTitle() })
  }
})

watch(() => [route.params.mangaId, route.params.volumeNum, route.params.chapterNum], async ([newMangaId, newVol, newNum]) => {
  if (newMangaId) mangaId.value = newMangaId
  if ((newVol && newVol !== volumeNum.value) || (newNum && newNum !== chapterNum.value)) {
    manga.value = getManga(mangaId.value)
    volumeNum.value = newVol
    chapterNum.value = newNum
    loading.value = true
    error.value = null
    if (!manga.value?.baseUrl) {
      error.value = 'Manga non trovato'
      loading.value = false
      return
    }
    if (manga.value?.urlPattern === 'chapterId' && !currentChapterData.value) {
      error.value = 'Capitolo non trovato (manca chapterId nel JSON)'
      loading.value = false
      return
    }
    try {
      const p = await discoverPages()
      pages.value = p
      totalPages.value = p.length
      const vol = String(newVol).padStart(3, '0')
      const ch = String(newNum)
      const pageFromQuery = route.query.page ? parseInt(route.query.page, 10) : null
      const bookmark = await loadBookmark(mangaId.value)
      const bookmarkPage = (bookmark?.volumeNum === vol && bookmark?.chapterNum === ch) ? bookmark.page : null
      currentPage.value = Math.min(Math.max(1, pageFromQuery ?? bookmarkPage ?? 1), p.length)
      if (totalPages.value === 0) error.value = 'Nessuna pagina trovata'
    } catch (e) {
      error.value = 'Errore nel caricamento'
    } finally {
      loading.value = false
    }
  }
})

const currentImageUrl = computed(() => getImageUrl(currentPage.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const curr = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const start = Math.max(1, curr - 2)
  const end = Math.min(total, start + 4)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function goBack() {
  router.push({ name: 'chapters', params: { mangaId: mangaId.value, volumeNum: volumeNum.value } })
}

function goToNextChapter() {
  if (!nextChapterRoute.value) return
  router.push({
    name: 'reader',
    params: nextChapterRoute.value
  })
}

function goToPage(p) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

function onKeydown(e) {
  if (e.key === 'ArrowLeft') prevPage()
  else if (e.key === 'ArrowRight') nextPage()
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="reader">
    <header class="reader-header">
      <button class="back-btn" @click="goBack">← Esci</button>
      <span class="chapter-info">Capitolo {{ chapterNum }} - Pagina {{ currentPage }}/{{ totalPages }}</span>
      <button class="next-chapter-btn" :disabled="!nextChapterRoute" @click="goToNextChapter">
        Vai al prossimo capitolo →
      </button>
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Caricamento pagine...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="back-btn" @click="goBack">Torna ai capitoli</button>
    </div>

    <div v-else class="reader-content">
      <button
        class="nav-btn prev"
        :disabled="currentPage <= 1"
        @click="prevPage"
      >
        ‹
      </button>

      <div class="image-container">
        <img
          :key="currentPage"
          :src="currentImageUrl"
          alt="Pagina"
          class="manga-page"
          @load="() => {}"
        />
      </div>

      <button
        class="nav-btn next"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
      >
        ›
      </button>
    </div>

    <div v-if="!loading && !error && totalPages > 1" class="page-nav">
      <span class="page-label">Pagina {{ currentPage }} / {{ totalPages }}</span>
      <div class="page-dots">
        <button
          v-for="p in visiblePages"
          :key="p"
          class="page-dot"
          :class="{ active: p === currentPage }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader {
  min-height: 100vh;
  background: #0d0d0d;
  display: flex;
  flex-direction: column;
}

.reader-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.back-btn {
  background: transparent;
  border: 1px solid rgba(233, 69, 96, 0.5);
  color: #e94560;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(233, 69, 96, 0.2);
}

.chapter-info {
  color: #a2a8c4;
  font-size: 0.95rem;
}

.next-chapter-btn {
  margin-left: auto;
  background: rgba(233, 69, 96, 0.15);
  border: 1px solid rgba(233, 69, 96, 0.6);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.next-chapter-btn:hover:not(:disabled) {
  background: rgba(233, 69, 96, 0.3);
  border-color: #e94560;
}

.next-chapter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.loading, .error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #a2a8c4;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(233, 69, 96, 0.3);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.reader-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  min-height: 0;
}

.nav-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(233, 69, 96, 0.15);
  border-color: #e94560;
  color: #e94560;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  overflow: auto;
}

.manga-page {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.page-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.page-label {
  color: #a2a8c4;
  font-size: 0.9rem;
}

.page-dots {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.page-dot {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.page-dot:hover {
  background: rgba(233, 69, 96, 0.2);
  border-color: #e94560;
}

.page-dot.active {
  background: #e94560;
  border-color: #e94560;
}

.page-ellipsis {
  color: #a2a8c4;
  padding: 0 0.25rem;
}
</style>
