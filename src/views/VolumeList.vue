<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMangaLibrary } from '../composables/useMangaLibrary'
import { useBookmark } from '../composables/useBookmark'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const mangaId = ref(route.params.mangaId)
const manga = ref(null)
const bookmark = ref(null)
const { getManga, loadManga, deleteManga, DEFAULT_MANGA_ID } = useMangaLibrary()
const { load: loadBookmark } = useBookmark()
const { user } = useAuth()

async function loadBookmarkData() {
  bookmark.value = await loadBookmark(mangaId.value)
}

onMounted(async () => {
  await loadManga()
  manga.value = getManga(mangaId.value)
  await loadBookmarkData()
})

watch(() => route.params.mangaId, (id) => {
  mangaId.value = id
  manga.value = getManga(id)
  loadBookmarkData()
})

watch(user, loadBookmarkData)

function goToVolume(vol) {
  const num = typeof vol.number === 'string' ? vol.number : String(vol.number).padStart(3, '0')
  router.push({ name: 'chapters', params: { mangaId: mangaId.value, volumeNum: num } })
}

function continueReading() {
  if (!bookmark.value) return
  const { volumeNum, chapterNum, page } = bookmark.value
  router.push({
    name: 'reader',
    params: { mangaId: mangaId.value, volumeNum, chapterNum },
    query: { page: String(page) }
  })
}

function goBack() {
  router.push({ name: 'library' })
}

async function removeManga() {
  if (!user || mangaId.value === DEFAULT_MANGA_ID) return
  if (!confirm('Eliminare questo manga dalla libreria?')) return
  try {
    await deleteManga(mangaId.value)
    router.push({ name: 'library' })
  } catch (e) {
    alert('Errore: ' + (e.message || 'Riprova'))
  }
}
</script>

<template>
  <div class="volume-list">
    <header class="header">
      <div class="header-row">
        <button class="back-btn" @click="goBack">← Libreria</button>
        <button
          v-if="user && manga && !manga.isDefault"
          class="delete-btn"
          @click="removeManga"
          title="Elimina manga"
        >
          🗑 Elimina
        </button>
      </div>
      <h1>{{ manga?.title || 'Caricamento...' }}</h1>
      <p v-if="manga" class="subtitle">Seleziona un volume</p>
    </header>

    <button
      v-if="bookmark"
      class="bookmark-btn"
      @click="continueReading"
    >
      📖 Continua: Capitolo {{ bookmark.chapterNum }} - Pagina {{ bookmark.page }}
      <span v-if="bookmark.chapterTitle" class="bookmark-title">{{ bookmark.chapterTitle }}</span>
    </button>

    <div v-if="manga" class="volumes-grid">
      <button
        v-for="vol in manga.volumes"
        :key="vol.number"
        class="volume-card"
        @click="goToVolume(vol)"
      >
        <span class="volume-num">Volume {{ vol.number }}</span>
        <span class="chapter-count">{{ vol.chapters?.length || 0 }} capitoli</span>
      </button>
    </div>

    <div v-else class="empty">
      <p>Manga non trovato</p>
      <button class="back-btn" @click="goBack">Torna alla libreria</button>
    </div>
  </div>
</template>

<style scoped>
.volume-list {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem;
}

.header-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.header-row .back-btn,
.header-row .delete-btn {
  margin-bottom: 0;
}

.delete-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 100, 100, 0.5);
  color: #ff6464;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.delete-btn:hover {
  background: rgba(255, 100, 100, 0.15);
}

.header {
  margin-bottom: 2rem;
}

.back-btn {
  background: transparent;
  border: 1px solid rgba(233, 69, 96, 0.5);
  color: #e94560;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(233, 69, 96, 0.2);
}

.header h1 {
  color: #e94560;
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #a2a8c4;
  font-size: 0.95rem;
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

.empty {
  text-align: center;
  color: #a2a8c4;
  padding: 3rem;
}
</style>
