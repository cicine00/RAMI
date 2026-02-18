// ─── Suits & Ranks ───────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface Card {
  id: string        // unique identifier ex: "hearts_7_0"
  suit: Suit | null // null si joker
  rank: Rank | null // null si joker
  isJoker: boolean
  points: number
}

// ─── Combination types ────────────────────────────────────────────────────────

export type CombinationType = 'suite' | 'brelan' | 'carre'

export interface Combination {
  type: CombinationType
  cards: Card[]
  points: number
  isValid: boolean
}

// ─── Game Variant ─────────────────────────────────────────────────────────────

export type GameVariant = 'classique' | 'avecJokers'

// ─── Game Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  variant: GameVariant
  totalDecks: number
  totalJokers: number
  cardsPerDealer: number
  cardsPerPlayer: number
  openingMinPoints: number
  openingRequiresSuite: boolean
  canTakeDiscard: boolean
  discardRequiresOpening: boolean
  discardPenalty: number
  penaltyPerCard: number
  jokerRecoverable: boolean
  maxPlayers: number
  minPlayers: number
  teamMode: boolean
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: string
  name: string
  hand: Card[]
  hasOpened: boolean
  openingPoints: number
  teamId: string | null
  isDealer: boolean
  score: number
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  playerIds: string[]
  hasOpened: boolean
  openingPoints: number
  score: number
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableCombination {
  combination: Combination
  playerId: string
  teamId: string | null
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'finished'
export type TurnAction = 'discard_only' | 'draw_then_play'

export interface GameState {
  id: string
  config: GameConfig
  phase: GamePhase
  players: Player[]
  teams: Team[]
  deck: Card[]
  discardPile: Card[]
  tableCombinations: TableCombination[]
  currentPlayerIndex: number
  turnAction: TurnAction
  roundNumber: number
  winnerId: string | null
  winnerTeamId: string | null
}

// ─── Action Results ───────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
}

export interface OpeningValidation {
  isValid: boolean
  totalPoints: number
  hasSuite: boolean
  error?: string
}
