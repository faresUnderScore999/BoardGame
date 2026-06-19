<template>
  <div class="game">
    <header class="game-header">
      <h2>🪗 Let's Get Tipsy!</h2>
      <div class="info">
        <span class="join-code">Code: {{ joinCode }}</span>
        <button @click="copyCode" class="btn-copy">📋</button>
      </div>
    </header>

    <div v-if="winner" class="winner-banner">🏆 {{ winner }} wins! 🎉</div>

    <div class="board-container">
      <div class="board" ref="boardRef">
        <div
          v-for="(text, idx) in BOARD"
          :key="idx"
          class="tile"
          :class="tileClass(idx)"
          :style="tileStyle(idx)"
        >
          <span class="tile-id">{{ idx }}</span>
          <div class="players-on-tile">
            <span
              v-for="p in playersOnTile(idx)"
              :key="p.id"
              class="token"
              :style="{ backgroundColor: playerColor(p.id) }"
              :title="p.nickname"
            >
              {{ playerEmoji(p.id) }}
            </span>
          </div>
          <span class="tile-text">{{ shortText(idx) }}</span>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="turn-indicator">
        <span v-if="status === 'playing'">
          Turn: <strong>{{ currentPlayerName }}</strong>
          <span v-if="isMyTurn" class="my-turn"> (Your turn!)</span>
        </span>
        <span v-else-if="status === 'lobby'">⏳ Waiting for game to start…</span>
        <span v-else-if="status === 'finished'">🏁 Game over</span>
      </div>

      <button
        v-if="isMyTurn && !winner && status === 'playing'"
        @click="handleRoll"
        class="btn btn-roll"
        :disabled="rolling"
      >
        🎲 {{ rolling ? 'Rolling…' : 'Roll Dice' }}
      </button>
      <div v-if="diceValue" class="dice-result">🎲 {{ diceValue }}</div>
    </div>

    <!-- Lobby overlay (waiting for start) -->
    <transition name="modal">
      <div v-if="showStartOverlay" class="modal-overlay" @click.self="showStartOverlay = false">
        <div class="modal">
          <h3>👥 Lobby</h3>
          <p>Share the code with friends to join!</p>
          <div class="join-code-large">{{ joinCode }}</div>
          <button v-if="players.length >= 2" @click="store.startGame()" class="btn btn-success">
            Start Game
          </button>
          <p v-else class="hint">Need at least 2 players</p>
        </div>
      </div>
    </transition>

    <!-- Tile effect modal -->
    <transition name="modal">
      <div v-if="tileText" class="modal-overlay" @click.self="tileText = null">
        <div class="modal">
          <h3>{{ rolledBy }} landed on space {{ currentPosition }}</h3>
          <p class="tile-action">{{ tileText }}</p>
          <button @click="tileText = null" class="btn btn-primary">Got it!</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const route = useRoute()
const router = useRouter()
const rolling = ref(false)
const tileText = ref(null)
const boardRef = ref(null)
const showStartOverlay = ref(false)

const joinCode = computed(() => store.joinCode)
const players = computed(() => store.players)
const currentTurn = computed(() => store.currentTurn)
const diceValue = computed(() => store.diceValue)
const winner = computed(() => store.winner)
const status = computed(() => store.status)
const rolledBy = computed(() => store.rolledBy)

const BOARD = [
  "START - Let's Get Tipsy!",
  'Take a shot',
  'Read the last message you sent out loud',
  'Roll again',
  'Safe Zone 😌',
  'Blue eyes get shot from everyone',
  'Go back 3 spaces',
  'Truth or Dare',
  'Vote who gets a drink from everyone',
  'Show your last photo',
  'Go back to START',
  'Fuck, Marry, Kill',
  'Safe Zone 😌',
  'Make a toast',
  'Would you rather...',
  'Copycat: Choose a twin for 2 rounds',
  'Give someone a nickname till end',
  'Youngest drinks from everyone',
  'Finish your drink',
  'Roll again',
  'Green eyes get a drink',
  'Never Have I Ever',
  'Categories: Pick a topic!',
  'Oldest drinks',
  'Go back 4 spaces',
  'Group selfie',
  'Thumb Master: last to notice drinks',
  'Tallest drinks',
  'No talking till next round',
  'Rock, Paper, Scissors: Duel right!',
  'Dare or pass your drink',
  'Go back 1 space',
  'Two Truths and a Lie',
  'Rhyme Time: Say a word, rhyme!',
  'Drink water',
  'Sing or pass your drink',
  'Shortest drinks',
  'Floor is Lava! Last feet off drinks',
  'Least drank gets beer/sip',
  'Go back 6 spaces',
  'Truth or pass your drink',
  'Medusa: Look up on 3!',
  'Most likely to...',
  'Safe Zone 😌',
  'Go to toilet',
  'Accent Trap: accent till next turn',
  'Call someone or back 10 spaces',
  "Don't drink for 3 rounds",
  'Skip next turn',
  'Switch drink with left',
  'Tornado: Switch seats right',
  'Mustache beer for 2 rounds',
  'Safe Zone 😌',
  'Staring Contest: Pick opponent',
  'Sniper: Send any back 2 spaces',
  'Sip Roulette: Even=2, Odd=give 2',
  'Go back 5 spaces',
  'No Names for 2 rounds',
  'Shield: Reflect drink someone',
  'Compliment Train',
  'Warp Zone: Nearest Safe Zone',
  'Take 3 sips',
  'Almost there... Finish drink!',
  'FINISH! Ultimate Winner!',
  'FINISH: The Ultimate Winner! (Make everyone else finish their drinks)',
]

const SAFE_ZONES = [4, 12, 43, 52]

const playerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316']
const playerEmojis = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠']

function playerColor(id) {
  const idx = players.value.findIndex((p) => p.id === id)
  return playerColors[idx % playerColors.length] || '#fff'
}

function playerEmoji(id) {
  const idx = players.value.findIndex((p) => p.id === id)
  return playerEmojis[idx % playerEmojis.length] || '👤'
}

function getRowCol(pos) {
  const row = Math.floor(pos / 8)
  let col = pos % 8
  if (row % 2 === 1) col = 7 - col
  return { row, col }
}

function tileClass(idx) {
  return {
    safe: SAFE_ZONES.includes(idx),
    start: idx === 0,
    finish: idx === 63,
  }
}

// Dynamic size for tiles – board adapts to viewport
function tileStyle(idx) {
  // no extra styling needed
  return {}
}

function shortText(idx) {
  const t = BOARD[idx]
  if (!t) return ''
  const words = t.split(' ')
  if (words.length <= 2) return t
  return words.slice(0, 2).join(' ') + '…'
}

function playersOnTile(idx) {
  return players.value.filter((p) => p.position === idx)
}

const isMyTurn = computed(() => store.currentTurn === store.playerId)
const currentPlayerName = computed(() => {
  const p = players.value.find((p) => p.id === store.currentTurn)
  return p ? p.nickname : '...'
})
const currentPosition = computed(() => {
  const p = players.value.find((p) => p.id === store.playerId)
  return p ? p.position : 0
})

watch(
  () => store.tileText,
  (val) => {
    if (val) {
      tileText.value = val
    }
  },
)

watch(
  () => store.diceValue,
  (val) => {
    if (val && !rolling.value) {
      rolling.value = true
      setTimeout(() => {
        rolling.value = false
      }, 800)
    }
  },
)

watch(
  () => store.status,
  (val) => {
    if (val === 'finished' && !winner.value) {
      const p = players.value.find((p) => p.position === 63)
      if (p) store.winner = p.nickname
    }
  },
)

watch(
  () => store.players,
  (val) => {
    if (val && val.length > 0) {
      showStartOverlay.value = store.status === 'lobby' && store.playerId === val[0]?.id
    }
  },
  { immediate: true },
)

store.socket?.on('gameStarted', (data) => {
  store.status = data.status
  store.currentTurn = data.currentTurn
  store.players = data.players
  store.diceValue = data.diceValue
})

store.socket?.on('stateUpdate', (data) => {
  store.diceValue = data.diceValue
  store.currentTurn = data.currentTurn
  store.players = data.players
  store.rolledBy = data.rolledBy
  if (data.tileText) {
    store.tileText = data.tileText
  }
})

store.socket?.on('gameComplete', (data) => {
  store.players = data.players
  store.status = 'finished'
  store.winner = data.winner
})

function handleRoll() {
  store.rollDice()
}

function copyCode() {
  navigator.clipboard.writeText(joinCode.value)
}

onMounted(() => {
  if (!store.gameId) {
    router.push('/')
  }
})
</script>

<style scoped>
.game {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  font-family: 'Segoe UI', sans-serif;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 700px;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.game-header h2 {
  margin: 0;
  font-size: 1.4rem;
}

.info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.join-code {
  background: #1f2937;
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
  font-weight: bold;
  color: #fbbf24;
  letter-spacing: 2px;
  font-size: 1rem;
}

.btn-copy {
  background: #374151;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.winner-banner {
  background: #7c2d12;
  padding: 0.5rem 1.5rem;
  border-radius: 40px;
  font-weight: bold;
  font-size: 1.3rem;
  color: #fbbf24;
  margin: 0.5rem 0;
  text-align: center;
  width: 100%;
  max-width: 700px;
}

.board-container {
  width: 100%;
  max-width: 700px;
  aspect-ratio: 1;
  margin: 0 auto;
}

.board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 4px;
  width: 100%;
  height: 100%;
}

.tile {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  position: relative;
  min-height: 0;
  transition: transform 0.2s;
}

.tile.safe {
  background: #064e3b;
  border-color: #10b981;
}
.tile.start {
  background: #1e3a8a;
  border-color: #3b82f6;
}
.tile.finish {
  background: #7c2d12;
  border-color: #f97316;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(249, 115, 22, 0);
  }
}

.tile-id {
  font-size: 0.6rem;
  color: #94a3b8;
  line-height: 1;
}

.players-on-tile {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  justify-content: center;
  margin: 1px 0;
}

.token {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.tile-text {
  font-size: 0.5rem;
  text-align: center;
  line-height: 1.1;
  color: #cbd5e1;
  word-break: break-word;
  padding: 0 1px;
}

.controls {
  margin-top: 1rem;
  text-align: center;
  width: 100%;
  max-width: 700px;
}

.turn-indicator {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  min-height: 2rem;
}

.my-turn {
  color: #10b981;
  font-weight: bold;
}

.btn {
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.btn:hover:not(:disabled) {
  transform: scale(1.05);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-roll {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  color: white;
}

.dice-result {
  margin-top: 0.5rem;
  font-size: 2rem;
  color: #fbbf24;
  transition: transform 0.2s;
  transform: scale(1);
  animation: dicePop 0.3s ease;
}

@keyframes dicePop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  80% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.modal {
  background: #1f2937;
  padding: 2rem;
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.modal h3 {
  margin: 0 0 1rem;
  color: #fbbf24;
}

.tile-action {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 1rem 0;
  color: #e2e8f0;
}

.join-code-large {
  font-size: 2.5rem;
  color: #fbbf24;
  font-weight: bold;
  letter-spacing: 6px;
  margin: 0.5rem 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.btn-success {
  background: #10b981;
  color: white;
}
.btn-primary {
  background: #3b82f6;
  color: white;
}
.hint {
  color: #94a3b8;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 600px) {
  .game-header h2 {
    font-size: 1.1rem;
  }
  .join-code {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
  }
  .token {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }
  .tile-text {
    font-size: 0.45rem;
  }
  .tile-id {
    font-size: 0.5rem;
  }
  .btn {
    padding: 0.6rem 1.5rem;
    font-size: 1rem;
  }
  .controls {
    margin-top: 0.75rem;
  }
  .winner-banner {
    font-size: 1.1rem;
    padding: 0.4rem 1rem;
  }
  .modal {
    padding: 1.5rem;
  }
  .join-code-large {
    font-size: 2rem;
  }
}

@media (max-width: 400px) {
  .tile {
    padding: 1px;
    border-radius: 4px;
  }
  .token {
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
    border-width: 1px;
  }
  .tile-text {
    font-size: 0.4rem;
  }
  .tile-id {
    font-size: 0.4rem;
  }
}
</style>
