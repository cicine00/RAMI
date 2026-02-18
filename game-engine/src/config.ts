import { GameConfig, GameVariant } from './types'

// ─── Points par carte ─────────────────────────────────────────────────────────
// As = 11pts, Figures (J,Q,K) = 10pts, autres = valeur numerique

export const CARD_POINTS: Record<string, number> = {
  'A': 11,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'JOKER': 0  // joker ne compte pas de points pour l'ouverture
}

// ─── Configs par variante ─────────────────────────────────────────────────────

const CONFIGS: Record<GameVariant, GameConfig> = {
  classique: {
    variant: 'classique',
    totalDecks: 2,
    totalJokers: 0,
    cardsPerDealer: 15,
    cardsPerPlayer: 14,
    openingMinPoints: 71,
    openingRequiresSuite: true,
    canTakeDiscard: true,
    discardRequiresOpening: true,
    discardPenalty: 71,
    penaltyPerCard: 10,
    jokerRecoverable: false,
    maxPlayers: 4,
    minPlayers: 2,
    teamMode: false
  },
  avecJokers: {
    variant: 'avecJokers',
    totalDecks: 2,
    totalJokers: 4,
    cardsPerDealer: 15,
    cardsPerPlayer: 14,
    openingMinPoints: 71,
    openingRequiresSuite: true,
    canTakeDiscard: true,
    discardRequiresOpening: true,
    discardPenalty: 71,
    penaltyPerCard: 10,
    jokerRecoverable: true,
    maxPlayers: 4,
    minPlayers: 2,
    teamMode: false
  }
}

export function getConfig(variant: GameVariant, teamMode: boolean = false): GameConfig {
  return { ...CONFIGS[variant], teamMode }
}
