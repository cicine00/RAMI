import { Card, Combination, GameConfig, GameState, OpeningValidation, Player, Team } from './types'
import { validateCombination, validateSuite, calcPoints } from './combination'

// ─── Valider une ouverture ────────────────────────────────────────────────────

export function validateOpening(
  combinations: Combination[],
  config: GameConfig,
  gameState: GameState,
  player: Player
): OpeningValidation {
  // Verifier que toutes les combinaisons sont valides
  const allValid = combinations.every(c => c.isValid)
  if (!allValid) {
    return {
      isValid: false,
      totalPoints: 0,
      hasSuite: false,
      error: 'Une ou plusieurs combinaisons sont invalides'
    }
  }

  // Calculer le total des points
  const totalPoints = combinations.reduce((sum, c) => sum + c.points, 0)

  // Verifier qu'il y a au moins une suite
  const hasSuite = combinations.some(c => c.type === 'suite')

  if (!hasSuite) {
    return {
      isValid: false,
      totalPoints,
      hasSuite: false,
      error: 'L\'ouverture doit contenir au moins une suite'
    }
  }

  // Determiner le seuil minimum requis
  const requiredPoints = getRequiredOpeningPoints(gameState, player, config)

  if (totalPoints < requiredPoints) {
    return {
      isValid: false,
      totalPoints,
      hasSuite,
      error: `Points insuffisants : ${totalPoints}pts (minimum requis : ${requiredPoints}pts)`
    }
  }

  return {
    isValid: true,
    totalPoints,
    hasSuite
  }
}

// ─── Calculer les points minimum requis pour ouvrir ───────────────────────────

export function getRequiredOpeningPoints(
  gameState: GameState,
  player: Player,
  config: GameConfig
): number {
  // Mode equipe
  if (config.teamMode && player.teamId) {
    const team = gameState.teams.find(t => t.id === player.teamId)
    const adverseTeam = gameState.teams.find(t => t.id !== player.teamId)

    // Si l'equipe adverse a deja ouvert, depasser ses points
    if (adverseTeam?.hasOpened) {
      return adverseTeam.openingPoints + 1
    }

    // Si le coequipier a deja ouvert, le joueur peut poser librement
    // mais doit quand meme avoir une suite
    if (team?.hasOpened) {
      return 0 // pas de minimum de points, mais suite obligatoire
    }
  }

  // Mode solo : verifier si un adversaire a deja ouvert
  if (!config.teamMode) {
    const hasAnyoneOpened = gameState.players.some(
      p => p.id !== player.id && p.hasOpened
    )

    if (hasAnyoneOpened) {
      // Trouver le maximum des points d'ouverture adverses
      const maxAdversePoints = Math.max(
        ...gameState.players
          .filter(p => p.id !== player.id && p.hasOpened)
          .map(p => p.openingPoints)
      )
      return maxAdversePoints + 1
    }
  }

  // Personne n'a encore ouvert : minimum de base (71pts)
  return config.openingMinPoints
}

// ─── Verifier si un joueur peut prendre la defausse ──────────────────────────

export function canTakeDiscard(
  player: Player,
  gameState: GameState,
  config: GameConfig
): { allowed: boolean; penalty: boolean } {
  if (!config.canTakeDiscard) {
    return { allowed: false, penalty: false }
  }

  // Mode equipe : si le coequipier a ouvert, le joueur peut prendre la defausse
  if (config.teamMode && player.teamId) {
    const team = gameState.teams.find(t => t.id === player.teamId)
    if (team?.hasOpened) {
      return { allowed: true, penalty: false }
    }
  }

  // Le joueur a deja ouvert : peut prendre la defausse librement
  if (player.hasOpened) {
    return { allowed: true, penalty: false }
  }

  // Le joueur n'a pas ouvert : peut prendre mais avec penalite
  return { allowed: true, penalty: true }
}

// ─── Appliquer l'ouverture ────────────────────────────────────────────────────

export function applyOpening(
  player: Player,
  team: Team | null,
  combinations: Combination[],
  totalPoints: number
): void {
  player.hasOpened = true
  player.openingPoints = totalPoints

  if (team) {
    team.hasOpened = true
    team.openingPoints = totalPoints
  }
}
