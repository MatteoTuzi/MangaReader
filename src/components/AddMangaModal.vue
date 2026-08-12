<script setup>
import { ref, computed } from 'vue'
import { useMangaLibrary } from '../composables/useMangaLibrary'
import { useMangaWorldScraper } from '../composables/useMangaWorldScraper'

const emit = defineEmits(['close', 'added'])
const { addManga } = useMangaLibrary()
const { scrape } = useMangaWorldScraper()

const title = ref('')
const baseUrl = ref('')
const urlPattern = ref('volume')
const mangaSlug = ref('')
const volumesJson = ref('')
const loading = ref(false)
const error = ref('')
const uploadedFileName = ref('')

const mangaworldUrl = ref('')
const importLimit = ref('10')
const importProgress = ref('')
const importing = ref(false)

const volumesPlaceholder = computed(() =>
  urlPattern.value === 'chapterId'
    ? '[{"number":"01","volumeId":"...","chapters":[{"num":"0001","title":"...","chapterId":"..."}]}]'
    : '[{"number":"001","chapters":[{"num":"001","title":"..."}]}]'
)

function onFileUpload(e) {
  const file = e.target?.files?.[0]
  if (!file || !file.name.endsWith('.json')) {
    error.value = 'Seleziona un file .json'
    return
  }
  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (data.volumes && Array.isArray(data.volumes)) {
        title.value = data.mangaTitle || data.title || file.name.replace('.json', '')
        baseUrl.value = data.baseUrl || ''
        urlPattern.value = data.urlPattern || 'volume'
        mangaSlug.value = data.mangaSlug || ''
        volumesJson.value = JSON.stringify(data.volumes, null, 2)
        uploadedFileName.value = file.name
      } else if (Array.isArray(data)) {
        volumesJson.value = JSON.stringify(data, null, 2)
        uploadedFileName.value = file.name
      } else {
        error.value = 'Formato non valido: servono "volumes" o un array'
      }
    } catch {
      error.value = 'File JSON non valido'
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

async function importFromMangaWorld() {
  error.value = ''
  if (!mangaworldUrl.value.trim()) {
    error.value = 'Inserisci l\'URL MangaWorld'
    return
  }
  importing.value = true
  importProgress.value = ''
  try {
    const limit = importLimit.value === 'tutti' ? null : parseInt(importLimit.value, 10) || 10
    const data = await scrape(mangaworldUrl.value, {
      limitVolumes: limit,
      reverse: true,
      onProgress: (msg) => { importProgress.value = msg }
    })
    title.value = data.mangaTitle
    baseUrl.value = data.baseUrl
    urlPattern.value = 'chapterId'
    mangaSlug.value = data.mangaSlug
    volumesJson.value = JSON.stringify(data.volumes, null, 2)
    uploadedFileName.value = 'Importato da MangaWorld'
    importProgress.value = `Importati ${data.volumes.length} volumi`
  } catch (e) {
    error.value = e.message || 'Errore durante l\'importazione'
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  const template = urlPattern.value === 'chapterId'
    ? {
        mangaTitle: 'Nome del manga',
        baseUrl: 'https://cdn.mangaworld.mx/chapters',
        urlPattern: 'chapterId',
        mangaSlug: 'berserk-5fb842b84c29e1099b62b0dd',
        pageFormat: 'raw',
        volumes: [
          {
            number: '01',
            volumeId: '5fb844014106670a1da64094',
            chapters: [
              { num: '0001', title: 'Capitolo 1', chapterId: '5fb844014106670a1da64095' }
            ]
          }
        ]
      }
    : {
        mangaTitle: 'Nome del manga',
        baseUrl: 'https://esempio.com/manga',
        urlPattern: 'volume',
        volumes: [
          { number: '001', chapters: [{ num: '001', title: 'Capitolo 1' }] }
        ]
      }
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'manga-template.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function submit() {
  error.value = ''
  if (!title.value.trim() || !baseUrl.value.trim()) {
    error.value = 'Compila titolo e URL base'
    return
  }
  let volumes
  try {
    volumes = JSON.parse(volumesJson.value || '[]')
  } catch {
    error.value = 'JSON volumi non valido'
    return
  }
  if (!Array.isArray(volumes) || volumes.length === 0) {
    error.value = 'Inserisci almeno un volume'
    return
  }
  if (urlPattern.value === 'chapterId' && !mangaSlug.value.trim()) {
    error.value = 'Per pattern chapterId serve il manga slug'
    return
  }
  loading.value = true
  try {
    const payload = {
      title: title.value.trim(),
      baseUrl: baseUrl.value.trim().replace(/\/$/, ''),
      urlPattern: urlPattern.value,
      volumes
    }
    if (urlPattern.value === 'chapterId') {
      payload.mangaSlug = mangaSlug.value.trim()
      payload.pageFormat = 'raw'
    }
    await addManga(payload)
    emit('added')
  } catch (e) {
    error.value = 'Errore: ' + (e.message || 'Riprova')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2>Aggiungi manga</h2>
      <form @submit.prevent="submit">
        <div class="field import-section">
          <label>Importa da MangaWorld</label>
          <div class="import-row">
            <input
              v-model="mangaworldUrl"
              type="url"
              placeholder="https://www.mangaworld.mx/manga/2278/berserk"
              class="import-url"
            />
            <select v-model="importLimit" class="import-limit">
              <option value="5">5 volumi</option>
              <option value="10">10 volumi</option>
              <option value="20">20 volumi</option>
              <option value="tutti">Tutti</option>
            </select>
            <button
              type="button"
              class="btn-import"
              :disabled="importing || !mangaworldUrl.trim()"
              @click="importFromMangaWorld"
            >
              {{ importing ? '...' : 'Importa' }}
            </button>
          </div>
          <span v-if="importProgress" class="import-progress">{{ importProgress }}</span>
        </div>
        <div class="field-divider">oppure</div>
        <div class="field">
          <label>Titolo</label>
          <input v-model="title" type="text" placeholder="Es. One Piece Volumi Colored" required />
        </div>
        <div class="field">
          <label>URL base</label>
          <input v-model="baseUrl" type="url" placeholder="https://..." required />
        </div>
        <div class="field">
          <label>Pattern URL</label>
          <select v-model="urlPattern">
            <option value="volume">volume{vol}/capitolo{chapter}/{page}.jpg</option>
            <option value="reader">reader/{chapter}/{page}.jpg</option>
            <option value="chapterId">chapterId (MangaWorld CDN: mangaSlug/volume-{vol}-{volId}/capitolo-{ch}-{chId}/{page}.jpg)</option>
          </select>
        </div>
        <div v-if="urlPattern === 'chapterId'" class="field">
          <label>Manga slug (es. berserk-5fb842b84c29e1099b62b0dd)</label>
          <input v-model="mangaSlug" type="text" placeholder="nome-id" />
        </div>
        <div class="field">
          <label>Carica file JSON o incolla sotto</label>
          <div class="upload-row">
            <label class="btn-upload">
              📁 Carica .json
              <input
                type="file"
                accept=".json"
                class="file-input-hidden"
                @change="onFileUpload"
              />
            </label>
            <button type="button" class="btn-link" @click="downloadTemplate">
              Scarica template
            </button>
          </div>
          <span v-if="uploadedFileName" class="uploaded-name">✓ {{ uploadedFileName }}</span>
        </div>
        <div class="field">
          <label>Volumi (JSON)</label>
          <textarea
            v-model="volumesJson"
            rows="8"
            :placeholder="volumesPlaceholder"
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="actions">
          <button type="button" class="btn-cancel" @click="emit('close')">Annulla</button>
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? 'Salvataggio...' : 'Aggiungi' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: #1a1a2e;
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  color: #e94560;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.import-section {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.import-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.import-url {
  flex: 1;
  min-width: 180px;
}

.import-limit {
  width: auto;
  min-width: 100px;
}

.btn-import {
  padding: 0.5rem 1rem;
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid #4caf50;
  border-radius: 8px;
  color: #4caf50;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-import:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
}

.btn-import:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-progress {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #4ade80;
}

.field-divider {
  text-align: center;
  color: #a2a8c4;
  font-size: 0.9rem;
  margin: 0.5rem 0 1rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  color: #a2a8c4;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
}

.field textarea {
  font-family: monospace;
  resize: vertical;
}

.upload-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: rgba(233, 69, 96, 0.2);
  border: 1px solid #e94560;
  border-radius: 6px;
  color: #e94560;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-upload:hover {
  background: rgba(233, 69, 96, 0.3);
}

.btn-link {
  background: none;
  border: none;
  color: #e94560;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: #ff6b8a;
}

.uploaded-name {
  font-size: 0.85rem;
  color: #4ade80;
}

.error {
  color: #e94560;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #a2a8c4;
  cursor: pointer;
}

.btn-submit {
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
