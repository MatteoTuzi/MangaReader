<script setup>
import AuthButton from './components/AuthButton.vue'
</script>

<template>
  <div id="app">
    <header class="app-header">
      <span class="app-title">Manga Reader</span>
      <AuthButton />
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.app-title {
  color: #e94560;
  font-weight: 600;
  font-size: 1.1rem;
}

main {
  min-height: calc(100vh - 52px);
}
</style>
