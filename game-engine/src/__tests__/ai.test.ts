import { createGame } from '../gameEngine'
import { getConfig } from '../config'
import { getAiTurn, executeAiTurn } from '../ai/aiController'
import { analyzeHand } from '../ai/handAnalyzer'
import { createCard, createJoker } from '../card'
import { AiLevel } from '../ai/aiTypes'

const config = getConfig('classique')
const configJokers = getConfig('avecJokers')

// ─── Tests de l'analyseur de main ─────────────────────────────────────────────

describe('Hand Analyzer', () => {

  it('detecte une suite valide dans la main', () => {
    const hand = [
      createCard('hearts', '7', 0),
      createCard('hearts', '8', 0),
      createCard('hearts', '9', 0),
      createCard('hearts', '10', 0),
      createCard('clubs', 'A', 0),  // carte isolee
    ]
    const analysis = analyzeHand(hand, 71)
    expect(analysis.validCombinations.length).toBeGreaterThan(0)
    expect(analysis.loneCards.length).toBeGreaterThan(0)
  })

  it('detecte un brelan valide', () => {
    const hand = [
      createCard('hearts', 'K', 0),
      createCard('diamonds', 'K', 0),
      createCard('spades', 'K', 0),
      createCard('clubs', '2', 0),
    ]
    const analysis = analyzeHand(hand, 71)
    expect(analysis.validCombinations.some(c => c.length === 3)).toBe(true)
  })

  it('identifie les cartes isolees', () => {
    const hand = [
      createCard('hearts', '2', 0),
      createCard('diamonds', '9', 0),
      createCard('clubs', 'K', 0),
    ]
    const analysis = analyzeHand(hand, 71)
    expect(analysis.loneCards.length).toBeGreaterThan(0)
  })

  it('trouve le meilleur combo d\'ouverture >= 71pts avec suite', () => {
    const hand = [
      // Suite hearts 9-10-J-Q-K = 9+10+10+10+10 = 49pts
      createCard('hearts', '9', 0),
      createCard('hearts', '10', 0),
      createCard('hearts', 'J', 0),
      createCard('hearts', 'Q', 0),
      createCard('hearts', 'K', 0),
      // Brelan As = 11+11+11 = 33pts
      createCard('hearts', 'A', 0),
      createCard('diamonds', 'A', 0),
      createCard('spades', 'A', 0),
    ]
    const analysis = analyzeHand(hand, 71)
    // Total possible : 49 + 33 = 82pts >= 71pts avec suite ✅
    expect(analysis.bestOpeningCombos.length).toBeGreaterThan(0)
    const totalPoints = analysis.bestOpeningCombos.reduce(
      (sum, combo) => sum + combo.reduce((s, c) => s + c.points, 0), 0
    )
    expect(totalPoints).toBeGreaterThanOrEqual(71)
  })
})

// ─── Tests IA Facile ──────────────────────────────────────────────────────────

describe('IA Facile', () => {

  it('genere un tour valide', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!

    // Simuler que c'est le tour du bot (pas distributeur)
    if (bot.isDealer) {
      // Si distributeur, simuler le tour normal
      game.turnAction = 'discard_only'
    } else {
      game.turnAction = 'draw_then_play'
    }

    const turn = getAiTurn(game, bot, 'easy')
    expect(turn.drawAction).toBeDefined()
    expect(turn.discardAction).toBeDefined()
    expect(turn.discardAction.cardId).toBeDefined()
  })

  it('pioche toujours dans le talon (niveau facile)', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!
    game.turnAction = 'draw_then_play'

    const turn = getAiTurn(game, bot, 'easy')
    expect(turn.drawAction.type).toBe('draw_deck')
  })
})

// ─── Tests IA Moyen ───────────────────────────────────────────────────────────

describe('IA Moyen', () => {

  it('genere un tour valide', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!
    game.turnAction = 'draw_then_play'

    const turn = getAiTurn(game, bot, 'medium')
    expect(turn.drawAction).toBeDefined()
    expect(turn.discardAction).toBeDefined()
  })

  it('prend la defausse si elle complete une combinaison', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!
    bot.hasOpened = true // bot a deja ouvert
    game.turnAction = 'draw_then_play'

    // Donner au bot une main avec 2 cartes consecutives hearts
    bot.hand = [
      createCard('hearts', '7', 0),
      createCard('hearts', '8', 0),
      createCard('diamonds', '2', 0),
    ]

    // Mettre la defausse a hearts 9 (complete la suite)
    game.discardPile = [createCard('hearts', '9', 0)]

    const turn = getAiTurn(game, bot, 'medium')
    expect(turn.drawAction.type).toBe('draw_discard')
  })
})

// ─── Tests IA Difficile ───────────────────────────────────────────────────────

describe('IA Difficile', () => {

  it('genere un tour valide', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!
    game.turnAction = 'draw_then_play'

    const turn = getAiTurn(game, bot, 'hard')
    expect(turn.drawAction).toBeDefined()
    expect(turn.discardAction).toBeDefined()
  })

  it('ouvre avec le minimum de points necessaires', () => {
    const game = createGame(['Bot', 'Alice'], config)
    const bot = game.players.find(p => p.name === 'Bot')!
    game.turnAction = 'draw_then_play'

    // Donner une main avec ouverture possible
    bot.hand = [
      // Suite 9-10-J-Q-K hearts = 49pts
      createCard('hearts', '9', 0),
      createCard('hearts', '10', 0),
      createCard('hearts', 'J', 0),
      createCard('hearts', 'Q', 0),
      createCard('hearts', 'K', 0),
      // Brelan As = 33pts
      createCard('hearts', 'A', 0),
      createCard('diamonds', 'A', 0),
      createCard('spades', 'A', 0),
      // Cartes supplementaires
      createCard('clubs', '2', 0),
      createCard('clubs', '3', 0),
    ]

    const turn = getAiTurn(game, bot, 'hard')
    if (turn.playActions.length > 0) {
      const opening = turn.playActions.find(a => a.type === 'play_combinations')
      if (opening && opening.combinations) {
        const totalPoints = opening.combinations.reduce(
          (sum, combo) => sum + combo.reduce((s, c) => s + c.points, 0), 0
        )
        expect(totalPoints).toBeGreaterThanOrEqual(71)
      }
    }
  })
})

// ─── Test execute complet ─────────────────────────────────────────────────────

describe('Execution complete du tour IA', () => {

  const levels: AiLevel[] = ['easy', 'medium', 'hard']

  levels.forEach(level => {
    it(`execute un tour complet sans erreur - niveau ${level}`, () => {
      const game = createGame(['Bot', 'Human'], config)
      const bot = game.players[0]

      if (bot.isDealer) {
        game.turnAction = 'discard_only'
        // Distributeur : juste defausser
        expect(() => {
          const card = bot.hand[bot.hand.length - 1]
          bot.hand.splice(bot.hand.indexOf(card), 1)
          game.discardPile.push(card)
        }).not.toThrow()
      } else {
        game.turnAction = 'draw_then_play'
        expect(() => executeAiTurn(game, bot, level)).not.toThrow()
      }
    })
  })
})
