import { Card, Combination, CombinationType } from './types'
import { RANK_ORDER } from './card'
import { CARD_POINTS } from './config'

// ─── Calculer les points d'une combinaison ────────────────────────────────────

export function calcPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => {
    if (card.isJoker) return sum // joker = 0pts pour l'ouverture
    return sum + (card.points || 0)
  }, 0)
}

// ─── Valider une suite ────────────────────────────────────────────────────────
// Suite = meme couleur, rangs consecutifs, minimum 3 cartes

export function validateSuite(cards: Card[]): boolean {
  if (cards.length < 3) return false

  const nonJokers = cards.filter(c => !c.isJoker)
  const jokerCount = cards.filter(c => c.isJoker).length

  if (nonJokers.length === 0) return false

  // Toutes les cartes non-joker doivent avoir la meme couleur
  const suit = nonJokers[0].suit
  if (!nonJokers.every(c => c.suit === suit)) return false

  // Trier par ordre de rang
  const sorted = [...nonJokers].sort((a, b) =>
    RANK_ORDER[a.rank!] - RANK_ORDER[b.rank!]
  )

  // Verifier la consecutivite avec les jokers pour combler les trous
  let jokersAvailable = jokerCount
  for (let i = 1; i < sorted.length; i++) {
    const gap = RANK_ORDER[sorted[i].rank!] - RANK_ORDER[sorted[i - 1].rank!] - 1
    if (gap < 0) return false // doublons
    if (gap > jokersAvailable) return false
    jokersAvailable -= gap
  }

  return true
}

// ─── Valider un brelan (3 cartes identiques) ──────────────────────────────────

export function validateBrelan(cards: Card[]): boolean {
  if (cards.length !== 3) return false

  const nonJokers = cards.filter(c => !c.isJoker)
  if (nonJokers.length === 0) return false

  const rank = nonJokers[0].rank
  // Toutes les non-jokers doivent avoir le meme rang
  if (!nonJokers.every(c => c.rank === rank)) return false

  // Les couleurs doivent etre differentes (regle marocaine)
  const suits = nonJokers.map(c => c.suit)
  const uniqueSuits = new Set(suits)
  return uniqueSuits.size === suits.length
}

// ─── Valider un carre (4 cartes identiques) ───────────────────────────────────

export function validateCarre(cards: Card[]): boolean {
  if (cards.length !== 4) return false

  const nonJokers = cards.filter(c => !c.isJoker)
  if (nonJokers.length === 0) return false

  const rank = nonJokers[0].rank
  if (!nonJokers.every(c => c.rank === rank)) return false

  const suits = nonJokers.map(c => c.suit)
  const uniqueSuits = new Set(suits)
  return uniqueSuits.size === suits.length
}

// ─── Detecter le type de combinaison ─────────────────────────────────────────

export function detectCombinationType(cards: Card[]): CombinationType | null {
  if (validateSuite(cards)) return 'suite'
  if (validateCarre(cards)) return 'carre'
  if (validateBrelan(cards)) return 'brelan'
  return null
}

// ─── Valider une combinaison ──────────────────────────────────────────────────

export function validateCombination(cards: Card[]): Combination {
  const type = detectCombinationType(cards)
  const points = calcPoints(cards)

  return {
    type: type || 'suite',
    cards,
    points,
    isValid: type !== null
  }
}

// ─── Verifier si on peut ajouter une carte a une combinaison existante ────────

export function canAddCardToCombination(combination: Combination, card: Card): boolean {
  if (!combination.isValid) return false

  const newCards = [...combination.cards, card]

  if (combination.type === 'suite') {
    return validateSuite(newCards)
  }

  if (combination.type === 'brelan') {
    // Brelan devient carre
    return validateCarre(newCards)
  }

  if (combination.type === 'carre') {
    return false // On ne peut pas ajouter a un carre
  }

  return false
}

// ─── Verifier si on peut recuperer un joker d'une combinaison ─────────────────

export function canReplaceJoker(combination: Combination, realCard: Card): {
  canReplace: boolean
  jokerIndex: number
} {
  if (!combination.isValid) return { canReplace: false, jokerIndex: -1 }

  for (let i = 0; i < combination.cards.length; i++) {
    if (combination.cards[i].isJoker) {
      // Tester si la vraie carte peut remplacer le joker
      const newCards = [...combination.cards]
      newCards[i] = realCard
      const type = detectCombinationType(newCards)
      if (type !== null) {
        return { canReplace: true, jokerIndex: i }
      }
    }
  }

  return { canReplace: false, jokerIndex: -1 }
}
