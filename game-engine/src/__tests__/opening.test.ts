import { validateOpening } from '../opening'
import { validateCombination } from '../combination'
import { createCard, createJoker } from '../card'
import { getConfig } from '../config'
import { createGame } from '../gameEngine'
import { GameState } from '../types'

describe('Regle d\'ouverture (71pts + suite obligatoire)', () => {

  const config = getConfig('classique')

  function makeGameState(playerNames: string[]): GameState {
    return createGame(playerNames, config)
  }

  it('valide une ouverture avec suite + brelan >= 71pts', () => {
    const gameState = makeGameState(['Alice', 'Bob'])
    const player = gameState.players[0]

    // Suite hearts 9-10-J-Q = 39pts + Brelan As = 33pts = 72pts
    const combinations = [
      validateCombination([
        createCard('hearts', '9', 0),
        createCard('hearts', '10', 0),
        createCard('hearts', 'J', 0),
        createCard('hearts', 'Q', 0)
      ]),
      validateCombination([
        createCard('hearts', 'A', 0),
        createCard('diamonds', 'A', 0),
        createCard('spades', 'A', 0)
      ])
    ]

    const result = validateOpening(combinations, config, gameState, player)
    expect(result.isValid).toBe(true)
    expect(result.hasSuite).toBe(true)
    expect(result.totalPoints).toBeGreaterThanOrEqual(71)
  })

  it('invalide une ouverture sans suite (meme >= 71pts)', () => {
    const gameState = makeGameState(['Alice', 'Bob'])
    const player = gameState.players[0]

    // Carre K = 40pts + Brelan A = 33pts = 73pts mais pas de suite
    const combinations = [
      validateCombination([
        createCard('hearts', 'K', 0),
        createCard('diamonds', 'K', 0),
        createCard('clubs', 'K', 0),
        createCard('spades', 'K', 0)
      ]),
      validateCombination([
        createCard('hearts', 'A', 0),
        createCard('diamonds', 'A', 0),
        createCard('spades', 'A', 0)
      ])
    ]

    const result = validateOpening(combinations, config, gameState, player)
    expect(result.isValid).toBe(false)
    expect(result.hasSuite).toBe(false)
    expect(result.error).toContain('suite')
  })

  it('invalide une ouverture avec suite mais < 71pts', () => {
    const gameState = makeGameState(['Alice', 'Bob'])
    const player = gameState.players[0]

    // Suite 2-3-4-5-6 hearts = 20pts seulement
    const combinations = [
      validateCombination([
        createCard('hearts', '2', 0),
        createCard('hearts', '3', 0),
        createCard('hearts', '4', 0),
        createCard('hearts', '5', 0),
        createCard('hearts', '6', 0)
      ])
    ]

    const result = validateOpening(combinations, config, gameState, player)
    expect(result.isValid).toBe(false)
    expect(result.totalPoints).toBeLessThan(71)
  })

  it('valide une suite seule >= 71pts', () => {
    const gameState = makeGameState(['Alice', 'Bob'])
    const player = gameState.players[0]

    // Suite hearts A-2-3-4-5-6-7-8-9-10 = 11+2+3+4+5+6+7+8+9+10 = 65pts pas assez
    // Suite hearts A-2-3-4-5-6-7-8-9-10-J = 11+2+3+4+5+6+7+8+9+10+10 = 75pts ok
    const combinations = [
      validateCombination([
        createCard('hearts', 'A', 0),
        createCard('hearts', '2', 0),
        createCard('hearts', '3', 0),
        createCard('hearts', '4', 0),
        createCard('hearts', '5', 0),
        createCard('hearts', '6', 0),
        createCard('hearts', '7', 0),
        createCard('hearts', '8', 0),
        createCard('hearts', '9', 0),
        createCard('hearts', '10', 0),
        createCard('hearts', 'J', 0)
      ])
    ]

    const result = validateOpening(combinations, config, gameState, player)
    expect(result.isValid).toBe(true)
    expect(result.hasSuite).toBe(true)
    expect(result.totalPoints).toBeGreaterThanOrEqual(71)
  })
})
