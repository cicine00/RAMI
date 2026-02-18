import { Server, Socket } from 'socket.io'
import { verifyToken } from '../auth/auth.service'
import {
  createSession, getSession, getCurrentSessionPlayer,
  runAiIfNeeded, finalizeSession, SessionPlayer
} from './gameSession'
import {
  drawFromDeck, drawFromDiscard, discardCard,
  playCombinations, addCardToTableCombination, recoverJoker
} from '../../../game-engine/src/gameEngine'
import { closeRoom } from '../room/room.service'

// ─── Map roomId → socketIds des joueurs ──────────────────────────────────────
const roomMembers = new Map<string, Set<string>>()

export function setupSocketHandlers(io: Server): void {

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Token manquant'))
    try {
      const payload = verifyToken(token)
      ;(socket as any).player = payload
      next()
    } catch {
      next(new Error('Token invalide'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const player = (socket as any).player

    // ─── Rejoindre une salle ──────────────────────────────────────────────────
    socket.on('room:join', ({ roomId, teamId }: { roomId: string; teamId?: string }) => {
      socket.join(roomId)
      if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set())
      roomMembers.get(roomId)!.add(socket.id)

      io.to(roomId).emit('room:player_joined', {
        playerId: player.id,
        username: player.username,
        teamId
      })
    })

    // ─── Demarrer la partie ───────────────────────────────────────────────────
    socket.on('room:start', async ({
      roomId, variant, teamMode, players, mode
    }: {
      roomId: string
      variant: 'classique' | 'avecJokers'
      teamMode: boolean
      mode: 'solo' | 'local' | 'online'
      players: SessionPlayer[]
    }) => {
      try {
        const session = createSession(roomId, players, variant, mode, teamMode)
        await closeRoom(roomId)

        // Envoyer l'etat initial (sans les mains des autres joueurs)
        players.forEach(p => {
          const socketId = p.socketId
          if (socketId) {
            const personalState = buildPersonalState(session.gameState, p.username)
            io.to(socketId).emit('game:started', personalState)
          }
        })

        // Lancer l'IA si le premier joueur est une IA
        runAiIfNeeded(session, (state) => {
          broadcastGameState(io, roomId, session)
          if (state.phase === 'finished') handleGameEnd(io, roomId, session)
        })

      } catch (err: any) {
        socket.emit('error', { message: err.message })
      }
    })

    // ─── Piocher dans le talon ────────────────────────────────────────────────
    socket.on('game:draw_deck', ({ roomId }: { roomId: string }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = drawFromDeck(session.gameState, gamePlayer.id)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      // Envoyer la carte piochee au joueur uniquement
      socket.emit('game:card_drawn', { card: result.card })
      broadcastGameState(io, roomId, session)
    })

    // ─── Prendre la defausse ──────────────────────────────────────────────────
    socket.on('game:draw_discard', ({ roomId }: { roomId: string }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = drawFromDiscard(session.gameState, gamePlayer.id)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      socket.emit('game:card_drawn', { card: result.card })
      broadcastGameState(io, roomId, session)
    })

    // ─── Poser des combinaisons ───────────────────────────────────────────────
    socket.on('game:play_combinations', ({ roomId, combinations }: {
      roomId: string
      combinations: any[][]
    }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = playCombinations(session.gameState, gamePlayer.id, combinations)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      broadcastGameState(io, roomId, session)
    })

    // ─── Ajouter a une combinaison sur table ──────────────────────────────────
    socket.on('game:add_to_table', ({ roomId, cardId, combinationIndex }: {
      roomId: string
      cardId: string
      combinationIndex: number
    }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = addCardToTableCombination(session.gameState, gamePlayer.id, cardId, combinationIndex)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      broadcastGameState(io, roomId, session)
    })

    // ─── Recuperer un joker ───────────────────────────────────────────────────
    socket.on('game:recover_joker', ({ roomId, cardId, combinationIndex }: {
      roomId: string
      cardId: string
      combinationIndex: number
    }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = recoverJoker(session.gameState, gamePlayer.id, cardId, combinationIndex)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      broadcastGameState(io, roomId, session)
    })

    // ─── Defausser ────────────────────────────────────────────────────────────
    socket.on('game:discard', ({ roomId, cardId }: { roomId: string; cardId: string }) => {
      const session = getSession(roomId)
      if (!session) return socket.emit('error', { message: 'Session introuvable' })

      const gamePlayer = getGamePlayer(session, player.username)
      if (!gamePlayer) return

      const result = discardCard(session.gameState, gamePlayer.id, cardId)
      if (!result.success) return socket.emit('game:error', { message: result.error })

      broadcastGameState(io, roomId, session)

      if (session.gameState.phase === 'finished') {
        handleGameEnd(io, roomId, session)
        return
      }

      // Lancer l'IA si c'est son tour
      runAiIfNeeded(session, (state) => {
        broadcastGameState(io, roomId, session)
        if (state.phase === 'finished') handleGameEnd(io, roomId, session)
      })
    })

    // ─── Deconnexion ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      roomMembers.forEach((members, roomId) => {
        if (members.has(socket.id)) {
          members.delete(socket.id)
          io.to(roomId).emit('room:player_left', { username: player.username })
        }
      })
    })
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGamePlayer(session: ReturnType<typeof getSession>, username: string) {
  if (!session) return null
  return session.gameState.players.find(p => p.name === username) || null
}

function buildPersonalState(gameState: any, username: string) {
  // Chaque joueur voit sa propre main, pas celles des autres
  return {
    ...gameState,
    players: gameState.players.map((p: any) => ({
      ...p,
      hand: p.name === username ? p.hand : p.hand.map(() => ({ hidden: true }))
    }))
  }
}

function broadcastGameState(io: Server, roomId: string, session: ReturnType<typeof getSession>) {
  if (!session) return

  // Envoyer un etat personnalise a chaque joueur
  session.players.forEach(sp => {
    if (!sp.socketId || sp.aiLevel) return
    const personalState = buildPersonalState(session.gameState, sp.username)
    io.to(sp.socketId).emit('game:state_updated', personalState)
  })
}

async function handleGameEnd(io: Server, roomId: string, session: ReturnType<typeof getSession>) {
  if (!session) return

  io.to(roomId).emit('game:finished', {
    winnerId: session.gameState.winnerId,
    winnerTeamId: session.gameState.winnerTeamId,
    scores: session.gameState.players.map(p => ({
      name: p.name,
      score: p.score,
      teamId: p.teamId
    }))
  })

  await finalizeSession(session)
}
