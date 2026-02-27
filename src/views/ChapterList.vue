<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import chaptersData from '../data/chapters.json'

const route = useRoute()
const router = useRouter()
const volume = ref(null)
const volumeNum = ref('')

onMounted(() => {
  volumeNum.value = route.params.volumeNum
  const num = String(volumeNum.value).replace(/^0+/, '') || '0'
  volume.value = chaptersData.volumes?.find(v => {
    const vn = String(v.number).replace(/^0+/, '') || '0'
    return vn === num
  }) || null
})

function goToReader(chapter) {
  const chapterNum = typeof chapter.num === 'string' ? chapter.num : String(chapter.num)
  const volNum = String(volume.value?.number ?? volumeNum.value).padStart(3, '0')
  router.push({ name: 'reader', params: { volumeNum: volNum, chapterNum } })
}

function goBack() {
  router.push({ name: 'volumes' })
}
</script>

<template>
  <div class="chapter-list">
    <header class="header">
      <button class="back-btn" @click="goBack">← Volumi</button>
      <h1>Volume {{ volume?.number ?? volumeNum }}</h1>
      <p v-if="volume" class="subtitle">{{ volume.chapters?.length || 0 }} capitoli</p>
    </header>

    <div v-if="volume" class="chapters-list">
      <button
        v-for="ch in volume.chapters"
        :key="ch.num"
        class="chapter-card"
        @click="goToReader(ch)"
      >
        <span class="chapter-num">Capitolo {{ ch.num }}</span>
        <span class="chapter-title">{{ ch.title }}</span>
      </button>
    </div>

    <div v-else class="empty">
      <p>Volume non trovato</p>
      <button class="back-btn" @click="goBack">Torna ai volumi</button>
    </div>
  </div>
</template>

<style scoped>
.chapter-list {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem;
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

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 600px;
}

.chapter-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chapter-card:hover {
  background: rgba(233, 69, 96, 0.15);
  border-color: #e94560;
  transform: translateX(4px);
}

.chapter-num {
  color: #e94560;
  font-weight: 600;
  font-size: 0.9rem;
}

.chapter-title {
  color: #e4e4e7;
  font-size: 0.95rem;
}

.empty {
  text-align: center;
  color: #a2a8c4;
  padding: 3rem;
}
</style>
