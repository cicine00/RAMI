import { v4 as uuidv4 } from 'uuid'
import {
  ActionResult, Card, Combination, GameConfig,
  GameState, Player, Team, TableCombination
} from './types'
import { getConfig } from './config'
import { createDeck, shuffleDeck } from './card'
import { dealCards, chooseDealer, getPlayOrder } from './dealer'
import { validateCombination, canAddCardToCombination, canReplaceJoker } from './combination'
import { validateOpening, canTakeDiscard, applyOpening, getRequiredOpeningPoints } from './opening'
import { detectWinner, finalizeScores, applyDiscardPenalty } from './scoring'

// ─── Creer une nouvelle partie ────────────────────────────────────────────────

export function createGame(
  playerNames: string[],
  config: GameConfig,
  teamAssignments?: { playerId: string; teamId: string }[]
): GameState {
  const players: Player[] = playerNames.map(name => ({
    id: uuidv4(),
    name,
    hand: [],
    hasOpened: false,
    openingPoints: 0,
    teamId: null,
    isDealer: false,
    score: 0
  }))

  // Choisir le distributeur
  const dealerId = chooseDealer(players.map(p => p.id))
  players.forEach(p => { p.isDealer = p.id === dealerId })

  // Creer les equipes si mode equipe
  const teams: Team[] = []
  if (config.teamMode && teamAssignments) {
    const teamMap = new Map<string, string[]>()
    for (const assignment of teamAssignments) {
      const player = players.find(p => p.name === assignment.playerId || p.id === assignment.playerId)
      if (player) {
        player.teamId = assignment.teamId
        if (!teamMap.has(assignment.teamId)) teamMap.set(assignment.teamId, [])
        teamMap.get(assignment.teamId)!.push(player.id)
      }
    }
    teamMap.forEach((playerIds, teamId) => {
      teams.push({ id: teamId, playerIds, hasOpened: false, openingPoints: 0, score: 0 })
    })
  }

  // Ordonner les joueurs (distributeur en premier)
  const orderedPlayers = getPlayOrder(players)

  const gameState: GameState = {
    id: uuidv4(),
    config,
    phase: 'dealing',
    players: orderedPlayers,
    teams,
    deck: [],
    discardPile: [],
    tableCombinations: [],
    currentPlayerIndex: 0,
    turnAction: 'discard_only', // 1er tour = distributeur defausse uniquement
    roundNumber: 1,
    winnerId: null,
    winnerTeamId: null
  }

  // Distribuer les cartes
  const dealResult = dealCards(orderedPlayers, config)
  orderedPlayers.forEach(p => {
    p.hand = dealResult.hands.get(p.id) || []
  })
  gameState.deck = dealResult.remainingDeck
  gameState.discardPile = dealResult.discardPile
  gameState.phase = 'playing'

  return gameState
}

// ─── Piocher une carte du talon ───────────────────────────────────────────────

export function drawFromDeck(gameState: GameState, playerId: string): ActionResult & { card?: Card } {
  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  if (gameState.turnAction === 'discard_only') {
    return { success: false, error: 'Le distributeur doit defausser directement' }
  }

  if (gameState.deck.length === 0) {
    // Remettre la defausse comme nouveau talon
    const newDeck = shuffleDeck(gameState.discardPile.slice(0, -1))
    gameState.deck = newDeck
    gameState.discardPile = [gameState.discardPile[gameState.discardPile.length - 1]]
  }

  const card = gameState.deck.shift()!
  player.hand.push(card)

  return { success: true, card }
}

// ─── Prendre la defausse ──────────────────────────────────────────────────────

export function drawFromDiscard(gameState: GameState, playerId: string): ActionResult & { card?: Card } {
  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  if (gameState.turnAction === 'discard_only') {
    return { success: false, error: 'Le distributeur doit defausser directement' }
  }

  if (gameState.discardPile.length === 0) {
    return { success: false, error: 'La defausse est vide' }
  }

  const { allowed, penalty } = canTakeDiscard(player, gameState, gameState.config)

  if (!allowed) {
    return { success: false, error: 'Vous ne pouvez pas prendre la defausse' }
  }

  if (penalty) {
    applyDiscardPenalty(player, gameState.config)
  }

  const card = gameState.discardPile.pop()!
  player.hand.push(card)

  return { success: true, card }
}

// ─── Defausser une carte ──────────────────────────────────────────────────────

export function discardCard(gameState: GameState, playerId: string, cardId: string): ActionResult {
  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  const cardIndex = player.hand.findIndex(c => c.id === cardId)
  if (cardIndex === -1) {
    return { success: false, error: 'Carte introuvable dans votre main' }
  }

  const [card] = player.hand.splice(cardIndex, 1)
  gameState.discardPile.push(card)

  // Verifier si le joueur a gagne (main vide)
  if (player.hand.length === 0) {
    const { winnerId, winnerTeamId } = detectWinner(gameState)
    if (winnerId) {
      gameState.winnerId = winnerId
      gameState.winnerTeamId = winnerTeamId
      gameState.phase = 'finished'
      finalizeScores(gameState)
      return { success: true }
    }
  }

  // Passer au joueur suivant
  nextTurn(gameState)

  return { success: true }
}

// ─── Poser des combinaisons (ouverture ou ajout) ──────────────────────────────

export function playCombinations(
  gameState: GameState,
  playerId: string,
  combinations: Card[][]
): ActionResult {
  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  const validatedCombinations = combinations.map(cards => validateCombination(cards))

  // Si le joueur n'a pas encore ouvert
  if (!player.hasOpened) {
    const team = gameState.teams.find(t => t.id === player.teamId) || null
    const openingResult = validateOpening(validatedCombinations, gameState.config, gameState, player)

    if (!openingResult.isValid) {
      return { success: false, error: openingResult.error }
    }

    // Retirer les cartes de la main
    const allCards = validatedCombinations.flatMap(c => c.cards)
    if (!removeCardsFromHand(player, allCards)) {
      return { success: false, error: 'Cartes introuvables dans votre main' }
    }

    applyOpening(player, team, validatedCombinations, openingResult.totalPoints)

    // Ajouter les combinaisons sur la table
    validatedCombinations.forEach(combo => {
      gameState.tableCombinations.push({
        combination: combo,
        playerId: player.id,
        teamId: player.teamId
      })
    })

    return { success: true }
  }

  // Joueur a deja ouvert : poser sur la table directement
  const allValid = validatedCombinations.every(c => c.isValid)
  if (!allValid) {
    return { success: false, error: 'Une ou plusieurs combinaisons sont invalides' }
  }

  const allCards = validatedCombinations.flatMap(c => c.cards)
  if (!removeCardsFromHand(player, allCards)) {
    return { success: false, error: 'Cartes introuvables dans votre main' }
  }

  validatedCombinations.forEach(combo => {
    gameState.tableCombinations.push({
      combination: combo,
      playerId: player.id,
      teamId: player.teamId
    })
  })

  return { success: true }
}

// ─── Ajouter une carte a une combinaison sur la table ─────────────────────────

export function addCardToTableCombination(
  gameState: GameState,
  playerId: string,
  cardId: string,
  combinationIndex: number
): ActionResult {
  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  if (!player.hasOpened) {
    return { success: false, error: 'Vous devez d\'abord ouvrir' }
  }

  const cardIndex = player.hand.findIndex(c => c.id === cardId)
  if (cardIndex === -1) {
    return { success: false, error: 'Carte introuvable dans votre main' }
  }

  const tableCombo = gameState.tableCombinations[combinationIndex]
  if (!tableCombo) {
    return { success: false, error: 'Combinaison introuvable sur la table' }
  }

  // Verifier mode equipe : on peut poser sur les combinaisons du coequipier
  const isTeammate = gameState.config.teamMode && tableCombo.teamId === player.teamId
  const isOwn = tableCombo.playerId === player.id

  if (!isOwn && !isTeammate) {
    return { success: false, error: 'Vous ne pouvez poser que sur vos combinaisons ou celles de votre coequipier' }
  }

  const card = player.hand[cardIndex]
  if (!canAddCardToCombination(tableCombo.combination, card)) {
    return { success: false, error: 'Cette carte ne peut pas etre ajoutee a cette combinaison' }
  }

  player.hand.splice(cardIndex, 1)
  tableCombo.combination.cards.push(card)
  tableCombo.combination.points += card.points

  return { success: true }
}

// ─── Recuperer un joker (variante jokers) ─────────────────────────────────────

export function recoverJoker(
  gameState: GameState,
  playerId: string,
  realCardId: string,
  combinationIndex: number
): ActionResult & { joker?: Card } {
  if (!gameState.config.jokerRecoverable) {
    return { success: false, error: 'La recuperation de joker n\'est pas disponible dans cette variante' }
  }

  const player = getCurrentPlayer(gameState)
  if (!player || player.id !== playerId) {
    return { success: false, error: 'Ce n\'est pas votre tour' }
  }

  if (!player.hasOpened) {
    return { success: false, error: 'Vous devez d\'abord ouvrir' }
  }

  const cardIndex = player.hand.findIndex(c => c.id === realCardId)
  if (cardIndex === -1) {
    return { success: false, error: 'Carte introuvable dans votre main' }
  }

  const tableCombo = gameState.tableCombinations[combinationIndex]
  if (!tableCombo) {
    return { success: false, error: 'Combinaison introuvable sur la table' }
  }

  const realCard = player.hand[cardIndex]
  const { canReplace, jokerIndex } = canReplaceJoker(tableCombo.combination, realCard)

  if (!canReplace) {
    return { success: false, error: 'Cette carte ne peut pas remplacer le joker' }
  }

  // Echanger la carte reelle avec le joker
  const joker = tableCombo.combination.cards[jokerIndex]
  tableCombo.combination.cards[jokerIndex] = realCard
  player.hand.splice(cardIndex, 1)
  player.hand.push(joker)

  return { success: true, joker }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentPlayer(gameState: GameState): Player | null {
  return gameState.players[gameState.currentPlayerIndex] || null
}

function removeCardsFromHand(player: Player, cards: Card[]): boolean {
  const handCopy = [...player.hand]
  for (const card of cards) {
    const index = handCopy.findIndex(c => c.id === card.id)
    if (index === -1) return false
    handCopy.splice(index, 1)
  }
  player.hand = handCopy
  return true
}

function nextTurn(gameState: GameState): void {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
  gameState.turnAction = 'draw_then_play'
  gameState.roundNumber++
}

// ─── Getter helpers ───────────────────────────────────────────────────────────

export function getCurrentPlayerState(gameState: GameState): Player | null {
  return getCurrentPlayer(gameState)
}

export function getGameSummary(gameState: GameState) {
  return {
    id: gameState.id,
    phase: gameState.phase,
    round: gameState.roundNumber,
    currentPlayer: getCurrentPlayer(gameState)?.name,
    deckSize: gameState.deck.length,
    discardTop: gameState.discardPile[gameState.discardPile.length - 1] || null,
    tableCombinations: gameState.tableCombinations.length,
    winner: gameState.winnerId
      ? gameState.players.find(p => p.id === gameState.winnerId)?.name
      : null
  }
}
