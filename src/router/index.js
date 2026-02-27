import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '../views/LibraryView.vue'
import VolumeList from '../views/VolumeList.vue'
import ChapterList from '../views/ChapterList.vue'
import Reader from '../views/Reader.vue'

const routes = [
  { path: '/', name: 'library', component: LibraryView },
  { path: '/manga/:mangaId', name: 'volumes', component: VolumeList },
  { path: '/manga/:mangaId/volume/:volumeNum', name: 'chapters', component: ChapterList },
  { path: '/manga/:mangaId/reader/:volumeNum/:chapterNum', name: 'reader', component: Reader },
  { path: '/volume/:volumeNum', redirect: to => ({ name: 'chapters', params: { mangaId: 'onepiece', volumeNum: to.params.volumeNum } }) },
  { path: '/reader/:volumeNum/:chapterNum', redirect: to => ({ name: 'reader', params: { mangaId: 'onepiece', volumeNum: to.params.volumeNum, chapterNum: to.params.chapterNum }, query: to.query }) }
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
