import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import pg from 'pg'
import crypto from 'crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_OxA4NqIEVDZ9@ep-green-recipe-as2kq12t-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
})

// Express + Socket.io setup
const app = express()
app.use(cors())
app.use(express.static(join(__dirname, '..', 'dist')))
const server = createServer(app)
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } })

const PORT = process.env.PORT || 4000

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
  'Go back to START 🛑',
  'Fuck, Marry, Kill',
  'Safe Zone 😌',
  'Make a toast',
  'Would you rather...',
  'The Copycat: Choose a twin for 2 rounds',
  'Give someone a nickname till the game ends',
  'Youngest gets a drink from everyone',
  'Finish your drink',
  'Roll again',
  'Green eyes get a drink',
  'Never Have I Ever',
  'Categories: Pick a topic, go in a circle!',
  'Oldest drinks',
  'Go back 4 spaces',
  'Group selfie',
  'Thumb Master: (Put thumb on table randomly; last to notice drinks)',
  'Tallest drinks',
  'No talking till next round',
  'Rock, Paper, Scissors: Duel the player to your right!',
  'Dare or pass your drink',
  'Go back 1 space',
  'Two Truths and a Lie',
  'Rhyme Time: Say a word, go in a circle rhyming',
  'Drink water 💧',
  'Sing or pass your drink',
  'Shortest drinks',
  'The Floor is Lava! (Last feet off the ground drinks)',
  'Least drank gets a beer/sip from everyone',
  'Go back 6 spaces',
  'Truth or pass your drink',
  'Medusa: Look up on 3! Eye contact = drink',
  'Most likely to...',
  'Safe Zone 😌',
  'Go to toilet 🚽',
  'Accent Trap: Speak in an accent till your next turn',
  'Call someone or back 10 spaces',
  "Don't drink for 3 rounds",
  'Skip next turn',
  'Switch drink with left',
  'Tornado: Everyone switch seats to the right! 🌪️',
  'Mustache beer for 2 rounds',
  'Safe Zone 😌',
  'Staring Contest: Pick an opponent',
  'Sniper: Send any player back 2 spaces',
  'Sip Roulette: Roll again (Even = drink 2, Odd = give 2)',
  'Go back 5 spaces',
  "No Names: Don't use real names for 2 rounds",
  'Shield: Save this to reflect your next drink to someone else 🛡️',
  'Compliment Train',
  'Warp Zone: Advance to the nearest Safe Zone!',
  'Take 3 sips',
  'Almost there... Finish your drink to cross the line!',
  'FINISH: The Ultimate Winner! (Make everyone else finish their drinks)',
]

const SAFE_ZONES = [4, 12, 43, 52]

function generateJoinCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5)
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      join_code VARCHAR(6) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'lobby',
      current_turn INTEGER DEFAULT 0,
      dice_value INTEGER DEFAULT 0,
      last_roll_player INTEGER DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      game_id INTEGER REFERENCES games(id),
      nickname VARCHAR(50) NOT NULL,
      position INTEGER DEFAULT 0,
      joined_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shield_holders (
      id SERIAL PRIMARY KEY,
      game_id INTEGER REFERENCES games(id),
      player_id INTEGER REFERENCES players(id),
      UNIQUE(game_id, player_id)
    )
  `)
  console.log('Database initialized')
}

// Socket.io logic
const rooms = new Map() // gameId -> { game, players: Map }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id)

  socket.on('createGame', async ({ nickname }) => {
    try {
      const joinCode = generateJoinCode()
      const result = await pool.query('INSERT INTO games (join_code) VALUES ($1) RETURNING id', [
        joinCode,
      ])
      const gameId = result.rows[0].id

      await pool.query('INSERT INTO players (game_id, nickname) VALUES ($1, $2) RETURNING id', [
        gameId,
        nickname,
      ])
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE game_id = $1 AND nickname = $2',
        [gameId, nickname],
      )
      const playerId = playerResult.rows[0].id

      socket.join(`game_${gameId}`)

      const game = {
        id: gameId,
        joinCode,
        status: 'lobby',
        currentTurn: 0,
        diceValue: 0,
        players: Array.from({ length: 1 }, () => ({ id: playerId, nickname, position: 0 })),
      }
      rooms.set(gameId, { game, players: new Map([[playerId, { nickname, position: 0 }]]) })

      socket.emit('gameCreated', { gameId, joinCode, playerId, nickname })
      io.to(`game_${gameId}`).emit('roomUpdate', { players: game.players, status: 'lobby' })
    } catch (err) {
      console.error(err)
      socket.emit('error', { message: 'Failed to create game' })
    }
  })

  socket.on('joinGame', async ({ joinCode, nickname }) => {
    try {
      const gameResult = await pool.query('SELECT * FROM games WHERE join_code = $1', [joinCode])
      if (gameResult.rows.length === 0) {
        return socket.emit('error', { message: 'Game not found' })
      }
      const game = gameResult.rows[0]

      if (game.status !== 'lobby') {
        return socket.emit('error', { message: 'Game has already started' })
      }

      const countResult = await pool.query('SELECT COUNT(*) FROM players WHERE game_id = $1', [
        game.id,
      ])
      if (parseInt(countResult.rows[0].count) >= 6) {
        return socket.emit('error', { message: 'Game is full (max 6 players)' })
      }

      await pool.query('INSERT INTO players (game_id, nickname) VALUES ($1, $2) RETURNING id', [
        game.id,
        nickname,
      ])
      const playerResult = await pool.query(
        'SELECT id, nickname, position FROM players WHERE game_id = $1 AND nickname = $2',
        [game.id, nickname],
      )
      const playerId = playerResult.rows[0].id

      socket.join(`game_${game.id}`)

      const roomData = rooms.get(game.id) || {
        game: {
          id: game.id,
          joinCode: game.join_code,
          status: 'lobby',
          currentTurn: 0,
          diceValue: 0,
          players: [],
        },
        players: new Map(),
      }

      if (!roomData.players.has(playerId)) {
        roomData.players.set(playerId, { nickname, position: playerResult.rows[0].position || 0 })
        roomData.game.players = Array.from(roomData.players.entries()).map(([id, p]) => ({
          id,
          nickname: p.nickname,
          position: p.position,
        }))
      }
      rooms.set(game.id, roomData)

      socket.emit('gameJoined', { gameId: game.id, joinCode, playerId, nickname, status: 'lobby' })
      io.to(`game_${game.id}`).emit('roomUpdate', {
        players: roomData.game.players,
        status: 'lobby',
      })
    } catch (err) {
      console.error(err)
      socket.emit('error', { message: 'Failed to join game' })
    }
  })

  socket.on('startGame', async ({ gameId }) => {
    try {
      const roomData = rooms.get(gameId)
      if (!roomData) return socket.emit('error', { message: 'Game not found' })

      // Build the players array from the roomData.players map
      roomData.game.players = Array.from(roomData.players.entries()).map(([id, p]) => ({
        id,
        nickname: p.nickname,
        position: p.position,
      }))

      // Set currentTurn to the first player's id (if there are players)
      if (roomData.game.players.length > 0) {
        roomData.game.currentTurn = roomData.game.players[0].id
      } else {
        roomData.game.currentTurn = 0 // fallback, but should not happen
      }

      roomData.game.status = 'playing'
      rooms.set(gameId, roomData)

      // Update the database with the new status and currentTurn
      await pool.query(
        'UPDATE games SET status = $1, current_turn = $2, updated_at = NOW() WHERE id = $3',
        ['playing', roomData.game.currentTurn, gameId],
      )

      io.to(`game_${gameId}`).emit('gameStarted', {
        status: 'playing',
        currentTurn: roomData.game.currentTurn,
        players: roomData.game.players,
        diceValue: 0,
      })
    } catch (err) {
      console.error(err)
      socket.emit('error', { message: 'Failed to start game' })
    }
  })

  socket.on('rollDice', async ({ gameId, playerId }) => {
    try {
      const roomData = rooms.get(gameId)
      if (!roomData) return socket.emit('error', { message: 'Game not found' })

      const game = roomData.game
      if (game.currentTurn !== playerId) {
        return socket.emit('error', { message: 'Not your turn' })
      }

      const diceValue = Math.floor(Math.random() * 6) + 1

      await pool.query(
        'UPDATE games SET dice_value = $1, last_roll_player = $2, updated_at = NOW() WHERE id = $3',
        [diceValue, playerId, gameId],
      )

      const playerData = roomData.players.get(playerId)
      const newPosition = Math.min(playerData.position + diceValue, 63)

      await pool.query('UPDATE players SET position = $1 WHERE id = $2', [newPosition, playerId])
      playerData.position = newPosition
      game.diceValue = diceValue

      // Update players array
      game.players = Array.from(roomData.players.entries()).map(([id, p]) => ({
        id,
        nickname: p.nickname,
        position: p.position,
      }))

      // Handle tile effects
      const tileText = BOARD[newPosition]
      let movedPositions = null
      let nextTurn = true

      if (newPosition === 6) {
        movedPositions = newPosition - 3
        const bpos = Math.max(0, movedPositions)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 10) {
        movedPositions = 0
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [0, playerId])
        playerData.position = 0
      } else if (newPosition === 24) {
        movedPositions = newPosition - 4
        const bpos = Math.max(0, movedPositions)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 31) {
        const bpos = Math.max(0, newPosition - 1)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 39) {
        const bpos = Math.max(0, newPosition - 6)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 46) {
        movedPositions = newPosition - 10
        const bpos = Math.max(0, movedPositions)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 56) {
        const bpos = Math.max(0, newPosition - 5)
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [bpos, playerId])
        playerData.position = bpos
      } else if (newPosition === 60) {
        // Warp to nearest safe zone before 60
        let nearestSafe = SAFE_ZONES.filter((s) => s < 60).pop() || 4
        await pool.query('UPDATE players SET position = $1 WHERE id = $2', [nearestSafe, playerId])
        playerData.position = nearestSafe
      } else if (newPosition === 63) {
        // Winner
        await pool.query('UPDATE games SET status = $1, updated_at = NOW() WHERE id = $2', [
          'finished',
          gameId,
        ])
        game.status = 'finished'
        io.to(`game_${gameId}`).emit('gameComplete', {
          winner: playerData.nickname,
          players: game.players,
        })
        return
      }

      game.players = Array.from(roomData.players.entries()).map(([id, p]) => ({
        id,
        nickname: p.nickname,
        position: p.position,
      }))

      // Advance turn
      const currentTurnIdx = game.players.findIndex((p) => p.id === playerId)
      let nextTurnIdx = (currentTurnIdx + 1) % game.players.length
      for (let i = 0; i < game.players.length; i++) {
        const candidate = (currentTurnIdx + 1 + i) % game.players.length
        if (game.players[candidate].position < 63) {
          nextTurnIdx = candidate
          break
        }
      }

      game.currentTurn = game.players[nextTurnIdx].id
      await pool.query('UPDATE games SET current_turn = $1, updated_at = NOW() WHERE id = $2', [
        game.currentTurn,
        gameId,
      ])

      rooms.set(gameId, roomData)

      io.to(`game_${gameId}`).emit('stateUpdate', {
        diceValue: game.diceValue,
        currentTurn: game.currentTurn,
        players: game.players,
        tileText,
        rolledBy: playerData.nickname,
        movedPositions,
      })
    } catch (err) {
      console.error(err)
      socket.emit('error', { message: 'Failed to roll dice' })
    }
  })

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id)
  })

  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '..', 'dist', 'index.html')))
})

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
