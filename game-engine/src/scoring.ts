import { GameConfig, GameState, Player, Team } from './types'
import { calcPoints } from './combination'

// ─── Calculer la penalite d'un joueur (cartes restantes en main) ──────────────

export function calcPlayerPenalty(player: Player, config: GameConfig): number {
  return player.hand.length * config.penaltyPerCard
}

// ─── Calculer les penalites de fin de partie ──────────────────────────────────

export function calcEndGameScores(gameState: GameState): Map<string, number> {
  const scores = new Map<string, number>()

  if (gameState.config.teamMode) {
    // Mode equipe : additionner les penalites des deux joueurs
    for (const team of gameState.teams) {
      const teamPenalty = team.playerIds.reduce((sum, playerId) => {
        const player = gameState.players.find(p => p.id === playerId)
        if (!player) return sum
        return sum + calcPlayerPenalty(player, gameState.config)
      }, 0)
      scores.set(team.id, teamPenalty)
    }
  } else {
    // Mode solo : penalite individuelle
    for (const player of gameState.players) {
      scores.set(player.id, calcPlayerPenalty(player, gameState.config))
    }
  }

  return scores
}

// ─── Appliquer la penalite de defausse ────────────────────────────────────────

export function applyDiscardPenalty(player: Player, config: GameConfig): void {
  player.score += config.discardPenalty
}

// ─── Detecter le gagnant ──────────────────────────────────────────────────────

export function detectWinner(gameState: GameState): {
  winnerId: string | null
  winnerTeamId: string | null
} {
  // Un joueur a vide sa main
  const winner = gameState.players.find(p => p.hand.length === 0)

  if (!winner) return { winnerId: null, winnerTeamId: null }

  return {
    winnerId: winner.id,
    winnerTeamId: winner.teamId
  }
}

// ─── Calculer le score total de la partie ─────────────────────────────────────

export function finalizeScores(gameState: GameState): void {
  const endScores = calcEndGameScores(gameState)

  if (gameState.config.teamMode) {
    for (const team of gameState.teams) {
      team.score += endScores.get(team.id) || 0
    }
  } else {
    for (const player of gameState.players) {
      player.score += endScores.get(player.id) || 0
    }
  }
}
