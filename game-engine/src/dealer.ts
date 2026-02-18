import { Card, GameConfig, Player } from './types'
import { createDeck, shuffleDeck } from './card'

// ─── Distribuer les cartes ────────────────────────────────────────────────────

export interface DealResult {
  hands: Map<string, Card[]>
  remainingDeck: Card[]
  discardPile: Card[]
}

export function dealCards(players: Player[], config: GameConfig): DealResult {
  const deck = shuffleDeck(createDeck(config.totalDecks, config.totalJokers))
  const hands = new Map<string, Card[]>()
  let deckIndex = 0

  // Distribuer les cartes a chaque joueur
  for (const player of players) {
    const cardCount = player.isDealer ? config.cardsPerDealer : config.cardsPerPlayer
    hands.set(player.id, deck.slice(deckIndex, deckIndex + cardCount))
    deckIndex += cardCount
  }

  // Retourner la premiere carte pour commencer la defausse
  const firstDiscard = deck[deckIndex]
  deckIndex++

  return {
    hands,
    remainingDeck: deck.slice(deckIndex),
    discardPile: [firstDiscard]
  }
}

// ─── Choisir le distributeur aleatoirement ────────────────────────────────────

export function chooseDealer(playerIds: string[]): string {
  const index = Math.floor(Math.random() * playerIds.length)
  return playerIds[index]
}

// ─── Ordre de jeu (sens des aiguilles) ───────────────────────────────────────

export function getPlayOrder(players: Player[]): Player[] {
  const dealerIndex = players.findIndex(p => p.isDealer)
  return [
    ...players.slice(dealerIndex),
    ...players.slice(0, dealerIndex)
  ]
}
