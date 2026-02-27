<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import chaptersData from '../data/chapters.json'
import { useBookmark } from '../composables/useBookmark'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const volumes = ref([])
const mangaTitle = ref('')
const bookmark = ref(null)
const { user } = useAuth()

async function loadBookmark() {
  const { load } = useBookmark()
  bookmark.value = await load()
}

onMounted(async () => {
  mangaTitle.value = chaptersData.mangaTitle || 'One Piece Volumi Colored'
  volumes.value = chaptersData.volumes || []
  await loadBookmark()
})

watch(user, () => loadBookmark())

function goToVolume(vol) {
  const num = typeof vol.number === 'string' ? vol.number : String(vol.number).padStart(3, '0')
  router.push({ name: 'chapters', params: { volumeNum: num } })
}

function continueReading() {
  if (!bookmark.value) return
  const { volumeNum, chapterNum, page } = bookmark.value
  router.push({
    name: 'reader',
    params: { volumeNum, chapterNum },
    query: { page: String(page) }
  })
}
</script>

<template>
  <div class="volume-list">
    <header class="header">
      <h1>{{ mangaTitle }}</h1>
      <p class="subtitle">Seleziona un volume per vedere i capitoli</p>
    </header>

    <button
      v-if="bookmark"
      class="bookmark-btn"
      @click="continueReading"
    >
      📖 Continua da dove eri: Capitolo {{ bookmark.chapterNum }} - Pagina {{ bookmark.page }}
      <span v-if="bookmark.chapterTitle" class="bookmark-title">{{ bookmark.chapterTitle }}</span>
    </button>

    <div class="volumes-grid">
      <button
        v-for="vol in volumes"
        :key="vol.number"
        class="volume-card"
        @click="goToVolume(vol)"
      >
        <span class="volume-num">Volume {{ vol.number }}</span>
        <span class="chapter-count">{{ vol.chapters?.length || 0 }} capitoli</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.volume-list {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header h1 {
  color: #e94560;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 20px rgba(233, 69, 96, 0.3);
}

.subtitle {
  color: #a2a8c4;
  font-size: 1rem;
}

.bookmark-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 1.5rem;
  padding: 1rem 1.5rem;
  background: rgba(233, 69, 96, 0.2);
  border: 1px solid #e94560;
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.bookmark-btn:hover {
  background: rgba(233, 69, 96, 0.35);
  transform: translateY(-1px);
}

.bookmark-title {
  color: #a2a8c4;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.volumes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.volume-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.volume-card:hover {
  background: rgba(233, 69, 96, 0.15);
  border-color: #e94560;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(233, 69, 96, 0.2);
}

.volume-num {
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
}

.chapter-count {
  color: #a2a8c4;
  font-size: 0.85rem;
}
</style>
