import { GameState, Player } from '../types'
import { AiLevel, AiTurn } from './aiTypes'
import { easyAiTurn } from './easyAi'
import { mediumAiTurn } from './mediumAi'
import { hardAiTurn } from './hardAi'

// ─── Controleur principal de l'IA ─────────────────────────────────────────────

export function getAiTurn(
  gameState: GameState,
  player: Player,
  level: AiLevel
): AiTurn {
  switch (level) {
    case 'easy':   return easyAiTurn(gameState, player)
    case 'medium': return mediumAiTurn(gameState, player)
    case 'hard':   return hardAiTurn(gameState, player)
  }
}

// ─── Appliquer le tour de l'IA au game engine ─────────────────────────────────

import {
  drawFromDeck,
  drawFromDiscard,
  playCombinations,
  addCardToTableCombination,
  recoverJoker,
  discardCard
} from '../gameEngine'

export function executeAiTurn(
  gameState: GameState,
  player: Player,
  level: AiLevel
): void {
  const turn = getAiTurn(gameState, player, level)

  // 1. Piocher (sauf premier tour distributeur)
  if (gameState.turnAction !== 'discard_only') {
    if (turn.drawAction.type === 'draw_discard') {
      drawFromDiscard(gameState, player.id)
    } else {
      drawFromDeck(gameState, player.id)
    }
  }

  // 2. Jouer les combinaisons / ajouts / recuperations
  for (const action of turn.playActions) {
    if (gameState.phase === 'finished') break

    if (action.type === 'play_combinations' && action.combinations) {
      playCombinations(gameState, player.id, action.combinations)
    }

    if (action.type === 'add_to_table' && action.cardId !== undefined && action.combinationIndex !== undefined) {
      addCardToTableCombination(gameState, player.id, action.cardId, action.combinationIndex)
    }

    if (action.type === 'recover_joker' && action.cardId !== undefined && action.combinationIndex !== undefined) {
      recoverJoker(gameState, player.id, action.cardId, action.combinationIndex)
    }
  }

  // 3. Defausser
  if (gameState.phase !== 'finished' && turn.discardAction.cardId) {
    // Verifier que la carte est encore dans la main
    const cardStillInHand = player.hand.find(c => c.id === turn.discardAction.cardId)
    if (cardStillInHand) {
      discardCard(gameState, player.id, turn.discardAction.cardId)
    } else {
      // Defausser la derniere carte si la carte choisie a ete posee
      if (player.hand.length > 0) {
        discardCard(gameState, player.id, player.hand[player.hand.length - 1].id)
      }
    }
  }
}

export * from './aiTypes'
