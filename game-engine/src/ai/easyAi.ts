import { Card, GameState, Player } from '../types'
import { AiTurn } from './aiTypes'
import { analyzeHand, chooseCardToDiscard } from './handAnalyzer'
import { calcPoints } from '../combination'
import { canTakeDiscard } from '../opening'

// ─── IA FACILE ────────────────────────────────────────────────────────────────
//
// Comportement : joue comme un debutant
// - Pioche toujours dans le talon (ignore la defausse)
// - Pose ses combinaisons des qu'il peut ouvrir
// - Defausse la carte avec le moins de points
// - Ne cherche pas a bloquer l'adversaire
// - Ne recupere jamais les jokers
// ─────────────────────────────────────────────────────────────────────────────

export function easyAiTurn(gameState: GameState, player: Player): AiTurn {
  const config = gameState.config
  const minPoints = config.openingMinPoints

  // 1. Analyser la main
  const analysis = analyzeHand(player.hand, minPoints)

  // 2. Action de pioche : toujours le talon (jamais la defausse)
  const drawAction = { type: 'draw_deck' as const }

  // 3. Actions de jeu : poser si possible
  const playActions = []

  if (!player.hasOpened && analysis.bestOpeningCombos.length > 0) {
    // Tenter l'ouverture
    const totalPoints = analysis.bestOpeningCombos.reduce(
      (sum, combo) => sum + calcPoints(combo), 0
    )
    if (totalPoints >= minPoints) {
      playActions.push({
        type: 'play_combinations' as const,
        combinations: analysis.bestOpeningCombos
      })
    }
  } else if (player.hasOpened && analysis.validCombinations.length > 0) {
    // Poser les combos valides disponibles
    playActions.push({
      type: 'play_combinations' as const,
      combinations: analysis.validCombinations
    })
  }

  // 4. Choisir la carte a defausser
  // Recalculer la main apres les poses eventuelles
  const cardsToPlay = playActions.flatMap(a => a.combinations?.flat() || [])
  const remainingHand = player.hand.filter(
    c => !cardsToPlay.find(pc => pc.id === c.id)
  )

  const cardToDiscard = remainingHand.length > 0
    ? chooseCardToDiscard(remainingHand, analyzeHand(remainingHand, minPoints))
    : player.hand[player.hand.length - 1]

  const discardAction = {
    type: 'discard' as const,
    cardId: cardToDiscard.id
  }

  return { drawAction, playActions, discardAction }
}
