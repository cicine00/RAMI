import { Card, Combination, GameState, Player } from '../types'

// ─── Niveaux de difficulte ────────────────────────────────────────────────────

export type AiLevel = 'easy' | 'medium' | 'hard'

// ─── Decision de l'IA ─────────────────────────────────────────────────────────

export type AiActionType =
  | 'draw_deck'       // piocher dans le talon
  | 'draw_discard'    // prendre la defausse
  | 'play_combinations' // poser des combinaisons
  | 'add_to_table'    // ajouter a une combinaison sur table
  | 'recover_joker'   // recuperer un joker
  | 'discard'         // defausser une carte

export interface AiAction {
  type: AiActionType
  cardId?: string
  combinations?: Card[][]
  combinationIndex?: number
}

// ─── Tour complet de l'IA ─────────────────────────────────────────────────────

export interface AiTurn {
  drawAction: AiAction           // piocher ou prendre defausse
  playActions: AiAction[]        // poser / ajouter
  discardAction: AiAction        // defausser
}

// ─── Analyse de la main ───────────────────────────────────────────────────────

export interface HandAnalysis {
  validCombinations: Card[][]    // groupes de cartes formant des combinaisons valides
  partialGroups: Card[][]        // groupes incomplets (2 cartes qui peuvent former combo)
  loneCards: Card[]              // cartes isolees
  totalPoints: number            // total points de la main
  bestOpeningCombos: Card[][]    // meilleures combos pour atteindre 71pts
}
