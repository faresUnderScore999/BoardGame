<template>
  <div class="lobby">
    <div class="lobby-box">
      <h1>🪗 Let's Get Tipsy!</h1>
      <p class="subtitle">Drinking board game – gather your friends!</p>

      <div v-if="joinCode" class="code-section">
        <p class="code-label">Your game code:</p>
        <div class="code-display">
          <strong>{{ joinCode }}</strong>
          <button @click="copyCode" class="btn-copy" title="Copy code">📋</button>
        </div>
        <p class="hint">Share this code with friends to join</p>
      </div>

      <div class="actions">
        <button v-if="!joinCode" @click="showCreate = true" class="btn btn-primary">
          🚀 Create Game
        </button>
        <button v-if="!joinCode" @click="showJoin = true" class="btn btn-secondary">
          🔗 Join Game
        </button>
        <button v-if="isCreator && players.length >= 2" @click="startGame" class="btn btn-success">
          🎮 Start Game
        </button>
        <p v-else-if="isCreator && players.length < 2" class="hint">
          Need at least 2 players to start
        </p>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <!-- Create modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal">
          <h3>Create a new game</h3>
          <input
            v-model="nicknameInput"
            placeholder="Your nickname"
            maxlength="20"
            @keyup.enter="handleCreate"
            autofocus
          />
          <div class="modal-actions">
            <button @click="handleCreate" class="btn btn-primary">Create</button>
            <button @click="showCreate = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Join modal -->
      <div v-if="showJoin" class="modal-overlay" @click.self="showJoin = false">
        <div class="modal">
          <h3>Join a game</h3>
          <input
            v-model="joinCodeInput"
            placeholder="Join code (5 letters/numbers)"
            maxlength="6"
            class="uppercase"
            autofocus
          />
          <input
            v-model="nicknameInput"
            placeholder="Your nickname"
            maxlength="20"
            @keyup.enter="handleJoin"
          />
          <div class="modal-actions">
            <button @click="handleJoin" class="btn btn-primary">Join</button>
            <button @click="showJoin = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <div class="players">
        <h3>👥 Players ({{ players.length }}/6)</h3>
        <div class="player-list">
          <div v-for="p in players" :key="p.id" class="player-tag">
            {{ p.nickname }}
            <span v-if="p.id === currentTurn" class="host">👑</span>
          </div>
          <div v-if="players.length === 0" class="empty-state">No players yet…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const router = useRouter()

const showCreate = ref(false)
const showJoin = ref(false)
const nicknameInput = ref('')
const joinCodeInput = ref('')
const error = ref('')

const joinCode = computed(() => store.joinCode)
const players = computed(() => store.players)
const currentTurn = computed(() => store.currentTurn)
const isCreator = computed(
  () => store.playerId && players.value.length > 0 && players.value[0]?.id === store.playerId,
)

watch(
  () => store.gameId,
  (val) => {
    if (val) router.push('/game')
  },
)

store.socket?.on('gameCreated', (data) => {
  store.gameId = data.gameId
  store.joinCode = data.joinCode
  store.playerId = data.playerId
  store.nickname = data.nickname
  router.push('/game')
})

store.socket?.on('gameJoined', (data) => {
  store.gameId = data.gameId
  store.joinCode = data.joinCode
  store.playerId = data.playerId
  store.nickname = data.nickname
  router.push('/game')
})

store.socket?.on('error', (err) => {
  error.value = err.message
})

function handleCreate() {
  const name = nicknameInput.value.trim()
  if (!name) {
    error.value = 'Please enter a nickname'
    return
  }
  showCreate.value = false
  store.createGame(name)
}

function handleJoin() {
  const code = joinCodeInput.value.trim().toUpperCase()
  const name = nicknameInput.value.trim()
  if (!code || !name) {
    error.value = 'Please fill in all fields'
    return
  }
  store.joinGame(code, name)
}

function startGame() {
  store.startGame()
}

function copyCode() {
  navigator.clipboard.writeText(joinCode.value)
}
</script>

<style scoped>
.lobby {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  padding: 1rem;
}

.lobby-box {
  background: #1f2937;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 480px;
  text-align: center;
}

h1 {
  font-size: 2.2rem;
  margin-bottom: 0.25rem;
  color: #fbbf24;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
}

.code-section {
  background: #111827;
  padding: 1rem;
  border-radius: 12px;
  margin: 1rem 0;
}

.code-label {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.3rem;
}

.code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1.8rem;
  letter-spacing: 4px;
  color: #fbbf24;
}

.btn-copy {
  background: #374151;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background 0.2s;
}
.btn-copy:hover {
  background: #4b5563;
}

.hint {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.3rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.btn {
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}
.btn-secondary {
  background: #6b7280;
  color: white;
}
.btn-success {
  background: #10b981;
  color: white;
}

.error {
  color: #ef4444;
  margin-top: 0.5rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.modal {
  background: #1f2937;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
}

.modal h3 {
  margin: 0 0 1.5rem 0;
  color: #fbbf24;
}

.modal input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  border: 1px solid #4b5563;
  background: #111827;
  color: white;
  font-size: 1rem;
}
.modal input:focus {
  outline: 2px solid #3b82f6;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.players {
  margin-top: 2rem;
  text-align: left;
}

.players h3 {
  text-align: center;
  margin-bottom: 0.75rem;
  color: #60a5fa;
}

.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.player-tag {
  background: #374151;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.95rem;
}

.host {
  color: #fbbf24;
}

.empty-state {
  color: #6b7280;
  font-style: italic;
}

.uppercase {
  text-transform: uppercase;
}

@media (max-width: 480px) {
  .lobby-box {
    padding: 1.5rem;
  }
  h1 {
    font-size: 1.8rem;
  }
  .code-display {
    font-size: 1.4rem;
  }
}
</style>
