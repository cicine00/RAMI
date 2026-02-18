import { GameState, GameConfig } from '../../../game-engine/src/types'
import { getConfig } from '../../../game-engine/src/config'
import { createGame, drawFromDeck, drawFromDiscard, discardCard, playCombinations, addCardToTableCombination, recoverJoker } from '../../../game-engine/src/gameEngine'
import { executeAiTurn } from '../../../game-engine/src/ai/aiController'
import { AiLevel } from '../../../game-engine/src/ai/aiTypes'
import { saveGameResult } from '../room/room.service'

// ─── Session de jeu en memoire ────────────────────────────────────────────────

export interface SessionPlayer {
  socketId: string
  playerId: string
  username: string
  aiLevel?: AiLevel  // undefined = joueur humain
  teamId?: string
}

export interface GameSession {
  roomId: string
  gameState: GameState
  players: SessionPlayer[]
  mode: 'solo' | 'local' | 'online'
}

// Map roomId → session
const sessions = new Map<string, GameSession>()

// ─── Creer une session ────────────────────────────────────────────────────────

export function createSession(
  roomId: string,
  players: SessionPlayer[],
  variant: 'classique' | 'avecJokers',
  mode: 'solo' | 'local' | 'online',
  teamMode: boolean
): GameSession {
  const config = getConfig(variant, teamMode)

  const teamAssignments = players
    .filter(p => p.teamId)
    .map(p => ({ playerId: p.playerId, teamId: p.teamId! }))

  const gameState = createGame(
    players.map(p => p.username),
    config,
    teamMode ? teamAssignments : undefined
  )

  const session: GameSession = { roomId, gameState, players, mode }
  sessions.set(roomId, session)
  return session
}

// ─── Recuperer une session ────────────────────────────────────────────────────

export function getSession(roomId: string): GameSession | undefined {
  return sessions.get(roomId)
}

// ─── Supprimer une session ────────────────────────────────────────────────────

export function deleteSession(roomId: string): void {
  sessions.delete(roomId)
}

// ─── Trouver le joueur courant dans la session ────────────────────────────────

export function getCurrentSessionPlayer(session: GameSession): SessionPlayer | undefined {
  const currentGamePlayer = session.gameState.players[session.gameState.currentPlayerIndex]
  return session.players.find(p => p.username === currentGamePlayer.name)
}

// ─── Executer le tour de l'IA si necessaire ───────────────────────────────────

export function runAiIfNeeded(session: GameSession, onStateChange: (state: GameState) => void): void {
  const current = getCurrentSessionPlayer(session)
  if (!current || !current.aiLevel) return

  // Petit delai pour simuler la reflexion de l'IA
  setTimeout(() => {
    const gamePlayer = session.gameState.players[session.gameState.currentPlayerIndex]
    executeAiTurn(session.gameState, gamePlayer, current.aiLevel!)
    onStateChange(session.gameState)

    // Continuer si le prochain joueur est aussi une IA
    if (session.gameState.phase === 'playing') {
      runAiIfNeeded(session, onStateChange)
    }
  }, 1200) // 1.2 secondes de delai pour l'animation
}

// ─── Finaliser et sauvegarder la partie ──────────────────────────────────────

export async function finalizeSession(session: GameSession): Promise<void> {
  const { gameState, mode } = session

  if (mode === 'online') {
    const players = gameState.players.map(gp => {
      const sp = session.players.find(p => p.username === gp.name)
      return {
        id: sp?.playerId || '',
        score: gp.score,
        teamId: gp.teamId,
        isWinner: gp.id === gameState.winnerId
      }
    }).filter(p => p.id && !session.players.find(sp => sp.username === '' || sp.aiLevel))

    await saveGameResult({
      variant: gameState.config.variant,
      mode,
      teamMode: gameState.config.teamMode,
      maxPlayers: gameState.players.length,
      winnerId: session.players.find(
        p => p.username === gameState.players.find(gp => gp.id === gameState.winnerId)?.name
      )?.playerId || null,
      players
    })
  }

  deleteSession(session.roomId)
}
