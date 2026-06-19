<template>
  <div class="lobby">
    <div class="lobby-box">
      <h1>🪗 Let's Get Tipsy!</h1>
      <p v-if="joinCode" class="code">
        Join Code: <strong>{{ joinCode }}</strong>
      </p>
      <p v-else>Create or join a game to get started</p>

      <div class="actions">
        <button v-if="!joinCode" @click="showCreate = true" class="btn btn-primary">
          Create New Game
        </button>
        <button v-if="!joinCode" @click="showJoin = true" class="btn btn-secondary">
          Join a Game
        </button>
        <button v-if="isCreator && players.length >= 2" @click="startGame" class="btn btn-success">
          Start Game
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <!-- Create modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal">
          <h3>Pick a Nickname</h3>
          <input
            v-model="nicknameInput"
            placeholder="Nickname"
            maxlength="20"
            @keyup.enter="handleCreate"
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
          <h3>Join Game</h3>
          <input v-model="joinCodeInput" placeholder="Join Code" maxlength="6" class="uppercase" />
          <input v-model="nicknameInput" placeholder="Nickname" maxlength="20" />
          <div class="modal-actions">
            <button @click="handleJoin" class="btn btn-primary">Join</button>
            <button @click="showJoin = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <div class="players">
        <h3>Players ({{ players.length }}/6)</h3>
        <ul>
          <li v-for="p in players" :key="p.id" class="player-tag">
            {{ p.nickname }} <span v-if="p.id === currentTurn" class="host">👑</span>
          </li>
        </ul>
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
    if (val) router.push(`/game`)
  },
)

store.socket?.on('gameCreated', (data) => {
  store.gameId = data.gameId
  store.joinCode = data.joinCode
  store.playerId = data.playerId
  store.nickname = data.nickname
  router.push(`/game`)
})

store.socket?.on('gameJoined', (data) => {
  store.gameId = data.gameId
  store.joinCode = data.joinCode
  store.playerId = data.playerId
  store.nickname = data.nickname
  router.push(`/game`)
})

store.socket?.on('error', (err) => {
  error.value = err.message
})

function handleCreate() {
  const name = nicknameInput.value.trim()
  if (!name) return
  showCreate.value = false
  store.createGame(name)
}

function handleJoin() {
  const code = joinCodeInput.value.trim()
  const name = nicknameInput.value.trim()
  if (!code || !name) return
  store.joinGame(code, name)
}

function startGame() {
  store.startGame()
}
</script>

<style scoped>
.lobby {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
}
.lobby-box {
  background: #1f2937;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 460px;
  text-align: center;
}
.code {
  font-size: 1.5rem;
  color: #fbbf24;
  margin: 1rem 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin: 1.5rem 0;
}
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn:hover {
  transform: translateY(-2px);
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
  margin-top: 0.75rem;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #1f2937;
  padding: 1.5rem;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
}
.modal input {
  width: 100%;
  padding: 0.6rem;
  margin: 0.5rem 0;
  border-radius: 6px;
  border: 1px solid #4b5563;
  background: #111827;
  color: white;
  font-size: 1rem;
}
.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
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
.player-tag {
  display: inline-block;
  background: #374151;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  margin: 0.25rem;
  font-size: 0.95rem;
}
.host {
  color: #fbbf24;
}
.uppercase {
  text-transform: uppercase;
}
</style>
