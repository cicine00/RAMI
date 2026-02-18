import { Card, GameState, Player } from '../types'
import { AiTurn, HandAnalysis } from './aiTypes'
import { analyzeHand, chooseCardToDiscard } from './handAnalyzer'
import { calcPoints, validateSuite, validateBrelan, validateCarre } from '../combination'
import { canTakeDiscard } from '../opening'
import { RANK_ORDER } from '../card'

// ─── IA MOYENNE ───────────────────────────────────────────────────────────────
//
// Comportement : joue comme un joueur regulier
// - Prend la defausse si elle complete une combinaison valide
// - Pose ses combinaisons des qu'il peut ouvrir
// - Defausse intelligemment (protege ses groupes partiels)
// - Evite de donner des cartes utiles a l'adversaire
// - Recupere les jokers si c'est evident (variante jokers)
// ─────────────────────────────────────────────────────────────────────────────

export function mediumAiTurn(gameState: GameState, player: Player): AiTurn {
  const config = gameState.config
  const minPoints = config.openingMinPoints
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1]

  // 1. Analyser la main
  const analysis = analyzeHand(player.hand, minPoints)

  // 2. Decider si on prend la defausse
  const shouldTakeDiscard = topDiscard
    ? discardIsUseful(topDiscard, player.hand, analysis)
    : false

  const { allowed } = canTakeDiscard(player, gameState, config)
  const takeDiscard = shouldTakeDiscard && allowed && topDiscard

  const drawAction = takeDiscard
    ? { type: 'draw_discard' as const }
    : { type: 'draw_deck' as const }

  // 3. Simuler la main apres pioche
  const simulatedHand = takeDiscard && topDiscard
    ? [...player.hand, topDiscard]
    : player.hand

  const simulatedAnalysis = analyzeHand(simulatedHand, minPoints)

  // 4. Actions de jeu
  const playActions = []

  if (!player.hasOpened && simulatedAnalysis.bestOpeningCombos.length > 0) {
    const totalPoints = simulatedAnalysis.bestOpeningCombos.reduce(
      (sum, combo) => sum + calcPoints(combo), 0
    )
    if (totalPoints >= minPoints) {
      playActions.push({
        type: 'play_combinations' as const,
        combinations: simulatedAnalysis.bestOpeningCombos
      })
    }
  } else if (player.hasOpened) {
    // Poser toutes les combos valides
    if (simulatedAnalysis.validCombinations.length > 0) {
      playActions.push({
        type: 'play_combinations' as const,
        combinations: simulatedAnalysis.validCombinations
      })
    }

    // Essayer d'ajouter sur les combinaisons de la table
    const tableAdditions = findTableAdditions(simulatedHand, gameState, player)
    playActions.push(...tableAdditions)
  }

  // 5. Choisir la carte a defausser intelligemment
  const cardsToPlay = playActions.flatMap(a => a.combinations?.flat() || [])
  const remainingHand = simulatedHand.filter(
    c => !cardsToPlay.find(pc => pc.id === c.id)
  )

  const cardToDiscard = remainingHand.length > 0
    ? smartDiscard(remainingHand, gameState, analyzeHand(remainingHand, minPoints))
    : simulatedHand[simulatedHand.length - 1]

  const discardAction = {
    type: 'discard' as const,
    cardId: cardToDiscard.id
  }

  return { drawAction, playActions, discardAction }
}

// ─── Verifier si la defausse est utile ───────────────────────────────────────

function discardIsUseful(discard: Card, hand: Card[], analysis: HandAnalysis): boolean {
  if (discard.isJoker) return true // joker toujours utile

  // Verifier si la carte complete un groupe partiel
  for (const group of analysis.partialGroups) {
    const testGroup = [...group, discard]
    if (validateSuite(testGroup) || validateBrelan(testGroup) || validateCarre(testGroup)) {
      return true
    }
  }

  // Verifier si la carte prolonge une combinaison valide
  for (const combo of analysis.validCombinations) {
    const testCombo = [...combo, discard]
    if (validateSuite(testCombo) || validateBrelan(testCombo)) {
      return true
    }
  }

  return false
}

// ─── Trouver les ajouts possibles sur la table ────────────────────────────────

function findTableAdditions(hand: Card[], gameState: GameState, player: Player): any[] {
  const actions = []

  for (let i = 0; i < gameState.tableCombinations.length; i++) {
    const tableCombo = gameState.tableCombinations[i]
    const isAccessible =
      tableCombo.playerId === player.id ||
      (gameState.config.teamMode && tableCombo.teamId === player.teamId)

    if (!isAccessible) continue

    for (const card of hand) {
      const testCards = [...tableCombo.combination.cards, card]
      const isValid = validateSuite(testCards) || validateBrelan(testCards) || validateCarre(testCards)
      if (isValid) {
        actions.push({
          type: 'add_to_table' as const,
          cardId: card.id,
          combinationIndex: i
        })
        break
      }
    }
  }

  return actions
}

// ─── Defausse intelligente ────────────────────────────────────────────────────
// Eviter de defausser des cartes qui completent des groupes partiels

function smartDiscard(hand: Card[], gameState: GameState, analysis: HandAnalysis): Card {
  // Ne pas defausser les cartes qui font partie de groupes partiels
  const protectedIds = new Set(analysis.partialGroups.flat().map(c => c.id))

  const discardCandidates = analysis.loneCards.filter(c => !protectedIds.has(c.id))

  if (discardCandidates.length > 0) {
    // Parmi les cartes isolees, eviter de donner une carte trop utile
    // (ne pas defausser la meme couleur/rang que les combos adverses sur table)
    return discardCandidates.reduce((worst, c) =>
      c.points < worst.points ? c : worst
    )
  }

  // Si toutes les cartes sont dans des groupes, defausser la moins utile
  return chooseCardToDiscard(hand, analysis)
}
