<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import chaptersData from '../data/chapters.json'

const route = useRoute()
const router = useRouter()
const volumeNum = ref('')
const chapterNum = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const pages = ref([])
const loading = ref(true)
const error = ref(null)

const baseUrl = computed(() => chaptersData.baseUrl || 'https://onepiecepower.com/manga8/onepiece/volumiSpeciali/volumiColored')

function getImageUrl(page) {
  const vol = String(volumeNum.value).padStart(3, '0')
  const pageStr = String(page).padStart(2, '0')
  return `${baseUrl.value}/volume${vol}/${chapterNum.value}/${pageStr}.jpg`
}

async function discoverPages() {
  const discovered = []
  let page = 1
  const maxPages = 500

  const checkPage = (p) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = getImageUrl(p)
    })
  }

  while (page <= maxPages) {
    const exists = await checkPage(page)
    if (exists) {
      discovered.push(page)
      page++
    } else {
      break
    }
  }

  return discovered
}

onMounted(async () => {
  volumeNum.value = route.params.volumeNum
  chapterNum.value = route.params.chapterNum
  loading.value = true
  error.value = null

  try {
    const p = await discoverPages()
    pages.value = p
    totalPages.value = p.length
    if (totalPages.value === 0) {
      error.value = 'Nessuna pagina trovata per questo capitolo'
    } else {
      currentPage.value = 1
    }
  } catch (e) {
    error.value = 'Errore nel caricamento delle pagine'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKeydown)
})

watch(() => [route.params.volumeNum, route.params.chapterNum], async ([newVol, newNum]) => {
  if ((newVol && newVol !== volumeNum.value) || (newNum && newNum !== chapterNum.value)) {
    volumeNum.value = newVol
    chapterNum.value = newNum
    loading.value = true
    error.value = null
    try {
      const p = await discoverPages()
      pages.value = p
      totalPages.value = p.length
      currentPage.value = 1
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
  router.push({ name: 'volumes' })
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
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Caricamento pagine...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="back-btn" @click="goBack">Torna ai volumi</button>
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
