import { createRouter, createWebHistory } from 'vue-router'
import VolumeList from '../views/VolumeList.vue'
import ChapterList from '../views/ChapterList.vue'
import Reader from '../views/Reader.vue'

const routes = [
  { path: '/', name: 'volumes', component: VolumeList },
  { path: '/volume/:volumeNum', name: 'chapters', component: ChapterList },
  { path: '/reader/:volumeNum/:chapterNum', name: 'reader', component: Reader }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
