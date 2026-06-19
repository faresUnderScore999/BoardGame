import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useGameStore = defineStore('game', {
  state: () => ({
    socket: null,
    gameId: null,
    joinCode: null,
    nickname: null,
    playerId: null,
    status: null,
    players: [],
    currentTurn: null,
    diceValue: null,
    tileText: null,
    rolledBy: null,
    winner: null,
  }),

  actions: {
    connect() {
      if (this.socket) {
        this.socket.connect()
        return
      }
      this.socket = io()
      this._registerHandlers()
    },

    _registerHandlers() {
      const s = this.socket
      s.on('connect', () => console.log('Socket connected:', s.id))
      s.on('gameCreated', (data) => {
        this.gameId = data.gameId
        this.joinCode = data.joinCode
        this.playerId = data.playerId
        this.nickname = data.nickname
      })
      s.on('gameJoined', (data) => {
        this.gameId = data.gameId
        this.joinCode = data.joinCode
        this.playerId = data.playerId
        this.nickname = data.nickname
      })
      s.on('roomUpdate', (data) => {
        this.players = data.players
        this.status = data.status
      })
      s.on('error', (err) => {
        // handled in components
      })
      s.on('gameStarted', (data) => {
        this.status = data.status
        this.currentTurn = data.currentTurn
        this.players = data.players
        this.diceValue = data.diceValue
      })
      s.on('stateUpdate', (data) => {
        this.diceValue = data.diceValue
        this.currentTurn = data.currentTurn
        this.players = data.players
        this.rolledBy = data.rolledBy
        if (data.tileText) {
          this.tileText = data.tileText
        }
      })
      s.on('gameComplete', (data) => {
        this.players = data.players
        this.status = 'finished'
        this.winner = data.winner
      })
    },

    createGame(nickname) {
      this.connect()
      this.nickname = nickname
      const emit = () => this.socket.emit('createGame', { nickname })
      if (this.socket.connected) emit()
      else this.socket.once('connect', emit)
    },

    joinGame(joinCode, nickname) {
      this.connect()
      this.nickname = nickname
      this.joinCode = joinCode
      const emit = () => this.socket.emit('joinGame', { joinCode, nickname })
      if (this.socket.connected) emit()
      else this.socket.once('connect', emit)
    },

    startGame() {
      this.socket.emit('startGame', { gameId: this.gameId })
    },

    rollDice() {
      this.socket.emit('rollDice', { gameId: this.gameId, playerId: this.playerId })
    },
  },
})
