import { Card, Suit, Rank } from './types'
import { CARD_POINTS } from './config'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

// ─── Rank order pour les suites ───────────────────────────────────────────────
export const RANK_ORDER: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
}

// ─── Creer une carte ──────────────────────────────────────────────────────────

export function createCard(suit: Suit, rank: Rank, deckIndex: number): Card {
  return {
    id: `${suit}_${rank}_${deckIndex}`,
    suit,
    rank,
    isJoker: false,
    points: CARD_POINTS[rank]
  }
}

export function createJoker(index: number): Card {
  return {
    id: `joker_${index}`,
    suit: null,
    rank: null,
    isJoker: true,
    points: 0
  }
}

// ─── Creer un deck complet ────────────────────────────────────────────────────

export function createDeck(totalDecks: number, totalJokers: number): Card[] {
  const deck: Card[] = []

  for (let d = 0; d < totalDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(suit, rank, d))
      }
    }
  }

  for (let j = 0; j < totalJokers; j++) {
    deck.push(createJoker(j))
  }

  return deck
}

// ─── Melanger le deck ─────────────────────────────────────────────────────────

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ─── Valeur numerique d'un rank ───────────────────────────────────────────────

export function getRankOrder(rank: Rank): number {
  return RANK_ORDER[rank]
}
