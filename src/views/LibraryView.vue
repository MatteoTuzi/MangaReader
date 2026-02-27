<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMangaLibrary } from '../composables/useMangaLibrary'
import { useBookmark } from '../composables/useBookmark'
import { useAuth } from '../composables/useAuth'
import AddMangaModal from '../components/AddMangaModal.vue'

const router = useRouter()
const { mangaList, loadManga, getManga } = useMangaLibrary()
const { load: loadBookmark } = useBookmark()
const { user } = useAuth()
const bookmark = ref(null)
const showAddModal = ref(false)

async function loadBookmarkData() {
  bookmark.value = await loadBookmark()
}

onMounted(async () => {
  await loadManga()
  await loadBookmarkData()
})

watch(user, loadBookmarkData)

function goToManga(manga) {
  router.push({ name: 'volumes', params: { mangaId: manga.id } })
}

function continueReading() {
  if (!bookmark.value?.mangaId) return
  const { mangaId, volumeNum, chapterNum, page } = bookmark.value
  router.push({
    name: 'reader',
    params: { mangaId, volumeNum, chapterNum },
    query: { page: String(page) }
  })
}

function onMangaAdded() {
  showAddModal.value = false
}
</script>

<template>
  <div class="library">
    <header class="header">
      <h1>Libreria Manga</h1>
      <p class="subtitle">Scegli un manga per iniziare a leggere</p>
    </header>

    <button
      v-if="bookmark"
      class="bookmark-btn"
      @click="continueReading"
    >
      📖 Continua: {{ getManga(bookmark.mangaId)?.title || 'Manga' }} - Capitolo {{ bookmark.chapterNum }} (pag. {{ bookmark.page }})
    </button>

    <div class="manga-grid">
      <button
        v-for="manga in mangaList"
        :key="manga.id"
        class="manga-card"
        @click="goToManga(manga)"
      >
        <span class="manga-title">{{ manga.title }}</span>
        <span class="manga-volumes">{{ manga.volumes?.length || 0 }} volumi</span>
      </button>
    </div>

    <button v-if="user" class="add-btn" @click="showAddModal = true">
      + Aggiungi manga
    </button>

    <AddMangaModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @added="onMangaAdded"
    />
  </div>
</template>

<style scoped>
.library {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: #e94560;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #a2a8c4;
  font-size: 1rem;
}

.bookmark-btn {
  display: block;
  width: 100%;
  max-width: 450px;
  margin: 0 auto 1.5rem;
  padding: 1rem 1.5rem;
  background: rgba(233, 69, 96, 0.2);
  border: 1px solid #e94560;
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.bookmark-btn:hover {
  background: rgba(233, 69, 96, 0.35);
  transform: translateY(-1px);
}

.manga-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto 2rem;
}

.manga-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.manga-card:hover {
  background: rgba(233, 69, 96, 0.15);
  border-color: #e94560;
  transform: translateY(-2px);
}

.manga-title {
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
}

.manga-volumes {
  color: #a2a8c4;
  font-size: 0.85rem;
}

.add-btn {
  display: block;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px dashed rgba(233, 69, 96, 0.5);
  border-radius: 10px;
  color: #e94560;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  border-style: solid;
  background: rgba(233, 69, 96, 0.1);
}
</style>
