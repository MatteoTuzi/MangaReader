import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Per GitHub Pages: cambia il nome se il repo è diverso da 'MangaReader'
  base: process.env.NODE_ENV === 'production' ? '/MangaReader/' : '/',
})
