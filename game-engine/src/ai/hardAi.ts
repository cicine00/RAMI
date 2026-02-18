import { Card, GameState, Player } from '../types'
import { AiTurn } from './aiTypes'
import { analyzeHand, chooseCardToDiscard } from './handAnalyzer'
import { calcPoints, validateSuite, validateBrelan, validateCarre, canReplaceJoker, validateCombination } from '../combination'
import { canTakeDiscard, getRequiredOpeningPoints } from '../opening'
import { RANK_ORDER } from '../card'

// ─── IA DIFFICILE ─────────────────────────────────────────────────────────────
//
// Comportement : joue comme un expert
// - Memorise les cartes jouees par les adversaires
// - Prend la defausse si strategiquement avantageux
// - Optimise l'ouverture pour depasser l'adversaire
// - Defausse les cartes les moins utiles aux adversaires
// - Recupere les jokers strategiquement
// - Essaie de terminer rapidement pour minimiser les penalites adverses
// - Bloque l'adversaire en gardant ses cartes cles
// ─────────────────────────────────────────────────────────────────────────────

export function hardAiTurn(gameState: GameState, player: Player): AiTurn {
  const config = gameState.config
  const minPoints = config.openingMinPoints
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1]

  // 1. Analyser la main
  const analysis = analyzeHand(player.hand, minPoints)

  // 2. Memoriser les cartes deja jouees (adversaires)
  const playedCards = getPlayedCards(gameState, player)

  // 3. Decider si on prend la defausse (strategie avancee)
  const { allowed, penalty } = canTakeDiscard(player, gameState, config)
  const takeDiscard = topDiscard && allowed && !penalty
    ? hardShouldTakeDiscard(topDiscard, player, gameState, analysis, playedCards)
    : false

  const drawAction = takeDiscard
    ? { type: 'draw_discard' as const }
    : { type: 'draw_deck' as const }

  // 4. Simuler la main apres pioche
  const simulatedHand = takeDiscard && topDiscard
    ? [...player.hand, topDiscard]
    : player.hand

  const simulatedAnalysis = analyzeHand(simulatedHand, minPoints)

  // 5. Actions de jeu (strategie optimisee)
  const playActions = []

  if (!player.hasOpened) {
    // Calculer le seuil a depasser
    const required = getRequiredOpeningPoints(gameState, player, config)
    const openingCombos = findOptimalOpening(simulatedAnalysis, required, gameState, player)

    if (openingCombos.length > 0) {
      playActions.push({
        type: 'play_combinations' as const,
        combinations: openingCombos
      })
    }
  } else {
    // Poser le maximum de combos pour vider la main rapidement
    if (simulatedAnalysis.validCombinations.length > 0) {
      playActions.push({
        type: 'play_combinations' as const,
        combinations: simulatedAnalysis.validCombinations
      })
    }

    // Ajouter sur la table (propre et coequipier)
    const tableAdditions = findAllTableAdditions(simulatedHand, gameState, player)
    playActions.push(...tableAdditions)

    // Recuperer les jokers si utile
    if (config.jokerRecoverable) {
      const jokerRecoveries = findJokerRecoveries(simulatedHand, gameState, player)
      playActions.push(...jokerRecoveries)
    }
  }

  // 6. Defausse strategique (ne pas aider l'adversaire)
  const cardsToPlay = playActions.flatMap(a => a.combinations?.flat() || [])
  const remainingHand = simulatedHand.filter(
    c => !cardsToPlay.find(pc => pc.id === c.id)
  )

  const cardToDiscard = remainingHand.length > 0
    ? hardDiscard(remainingHand, gameState, player, analyzeHand(remainingHand, minPoints), playedCards)
    : simulatedHand[simulatedHand.length - 1]

  const discardAction = {
    type: 'discard' as const,
    cardId: cardToDiscard.id
  }

  return { drawAction, playActions, discardAction }
}

// ─── Memoriser les cartes jouees ──────────────────────────────────────────────

function getPlayedCards(gameState: GameState, currentPlayer: Player): Card[] {
  const played: Card[] = []

  // Cartes sur la table
  gameState.tableCombinations.forEach(tc => {
    tc.combination.cards.forEach(c => played.push(c))
  })

  // Cartes dans la defausse
  gameState.discardPile.forEach(c => played.push(c))

  return played
}

// ─── Strategie avancee pour prendre la defausse ───────────────────────────────

function hardShouldTakeDiscard(
  discard: Card,
  player: Player,
  gameState: GameState,
  analysis: HandAnalysis,
  playedCards: Card[]
): boolean {
  if (discard.isJoker) return true

  // Verifier si complete une combinaison
  for (const group of analysis.partialGroups) {
    const testGroup = [...group, discard]
    if (validateSuite(testGroup) || validateBrelan(testGroup)) {
      return true
    }
  }

  // Verifier si complete une combo valide existante
  for (const combo of analysis.validCombinations) {
    const testCombo = [...combo, discard]
    if (validateSuite(testCombo) || validateCarre(testCombo)) {
      return true
    }
  }

  // Verifier si la carte est rare (peu de copies restantes dans le deck)
  const copiesPlayed = playedCards.filter(
    c => !c.isJoker && c.rank === discard.rank && c.suit === discard.suit
  ).length
  if (copiesPlayed >= 1 && discard.points >= 10) return true // carte rare et haute valeur

  return false
}

// ─── Trouver l'ouverture optimale (depasse le seuil requis, pas trop non plus) ─

function findOptimalOpening(
  analysis: HandAnalysis,
  requiredPoints: number,
  gameState: GameState,
  player: Player
): Card[][] {
  const validCombos = analysis.validCombinations
  const n = validCombos.length
  let bestSelection: Card[][] = []
  let bestPoints = Infinity // minimiser les points poses (garder les meilleures cartes)

  for (let mask = 1; mask < (1 << n); mask++) {
    const selected: Card[][] = []
    let points = 0
    let hasSuite = false
    const usedIds = new Set<string>()
    let hasOverlap = false

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        // Verifier pas de chevauchement de cartes
        for (const card of validCombos[i]) {
          if (usedIds.has(card.id)) { hasOverlap = true; break }
          usedIds.add(card.id)
        }
        if (hasOverlap) break
        selected.push(validCombos[i])
        points += calcPoints(validCombos[i])
        if (validateSuite(validCombos[i])) hasSuite = true
      }
    }

    if (!hasOverlap && points >= requiredPoints && hasSuite) {
      // Minimiser les points poses pour garder les meilleures cartes en main
      if (points < bestPoints) {
        bestSelection = selected
        bestPoints = points
      }
    }
  }

  return bestSelection
}

// ─── Trouver tous les ajouts possibles sur la table ──────────────────────────

function findAllTableAdditions(hand: Card[], gameState: GameState, player: Player): any[] {
  const actions = []

  for (let i = 0; i < gameState.tableCombinations.length; i++) {
    const tableCombo = gameState.tableCombinations[i]
    const isAccessible =
      tableCombo.playerId === player.id ||
      (gameState.config.teamMode && tableCombo.teamId === player.teamId)

    if (!isAccessible) continue

    for (const card of hand) {
      const testCards = [...tableCombo.combination.cards, card]
      if (validateSuite(testCards) || validateBrelan(testCards) || validateCarre(testCards)) {
        actions.push({
          type: 'add_to_table' as const,
          cardId: card.id,
          combinationIndex: i
        })
      }
    }
  }

  return actions
}

// ─── Trouver les recuperations de jokers ─────────────────────────────────────

function findJokerRecoveries(hand: Card[], gameState: GameState, player: Player): any[] {
  const actions = []

  for (let i = 0; i < gameState.tableCombinations.length; i++) {
    const tableCombo = gameState.tableCombinations[i]
    const hasJoker = tableCombo.combination.cards.some(c => c.isJoker)
    if (!hasJoker) continue

    for (const card of hand) {
      if (card.isJoker) continue
      const { canReplace } = canReplaceJoker(tableCombo.combination, card)
      if (canReplace) {
        actions.push({
          type: 'recover_joker' as const,
          cardId: card.id,
          combinationIndex: i
        })
        break
      }
    }
  }

  return actions
}

// ─── Defausse difficile : ne pas aider l'adversaire ──────────────────────────

function hardDiscard(
  hand: Card[],
  gameState: GameState,
  player: Player,
  analysis: HandAnalysis,
  playedCards: Card[]
): Card {
  // Cartes qui seraient utiles aux adversaires (meme rang que leurs combos)
  const adverseRanks = new Set<string>()
  gameState.tableCombinations.forEach(tc => {
    if (tc.playerId !== player.id && tc.teamId !== player.teamId) {
      tc.combination.cards.forEach(c => {
        if (!c.isJoker) adverseRanks.add(c.rank!)
      })
    }
  })

  // Cartes isolees qui ne seraient pas utiles a l'adversaire
  const safeLoneCards = analysis.loneCards.filter(
    c => !c.isJoker && !adverseRanks.has(c.rank!)
  )

  if (safeLoneCards.length > 0) {
    // Defausser la moins utile parmi les cartes isolees "sures"
    return safeLoneCards.reduce((min, c) => c.points < min.points ? c : min)
  }

  if (analysis.loneCards.length > 0) {
    return analysis.loneCards.reduce((min, c) => c.points < min.points ? c : min)
  }

  // Dernier recours
  return chooseCardToDiscard(hand, analysis)
}

// ─── Import manquant ──────────────────────────────────────────────────────────

import { HandAnalysis } from './aiTypes'
