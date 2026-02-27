<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, isConfigured, loginWithGoogle, logout } = useAuth()
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await loginWithGoogle()
  } catch (e) {
    alert('Accesso fallito. Riprova.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="isConfigured" class="auth-btn">
    <template v-if="user">
      <span class="user-email">{{ user.email }}</span>
      <button class="btn-logout" @click="logout">Esci</button>
    </template>
    <button v-else class="btn-login" :disabled="loading" @click="handleLogin">
      {{ loading ? '...' : 'Accedi con Google per sincronizzare' }}
    </button>
  </div>
</template>

<style scoped>
.auth-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-email {
  color: #a2a8c4;
  font-size: 0.85rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-login,
.btn-logout {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-login {
  background: #4285f4;
  border: none;
  color: #fff;
}

.btn-login:hover:not(:disabled) {
  background: #3367d6;
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #a2a8c4;
}

.btn-logout:hover {
  border-color: #e94560;
  color: #e94560;
}
</style>
