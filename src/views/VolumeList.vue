<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import chaptersData from '../data/chapters.json'

const router = useRouter()
const volumes = ref([])
const mangaTitle = ref('')

onMounted(() => {
  mangaTitle.value = chaptersData.mangaTitle || 'One Piece Volumi Colored'
  volumes.value = chaptersData.volumes || []
})

function goToVolume(vol) {
  const num = typeof vol.number === 'string' ? vol.number : String(vol.number).padStart(3, '0')
  router.push({ name: 'chapters', params: { volumeNum: num } })
}
</script>

<template>
  <div class="volume-list">
    <header class="header">
      <h1>{{ mangaTitle }}</h1>
      <p class="subtitle">Seleziona un volume per vedere i capitoli</p>
    </header>

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
