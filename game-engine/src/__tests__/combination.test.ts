import { validateSuite, validateBrelan, validateCarre, validateCombination, calcPoints } from '../combination'
import { createCard, createJoker } from '../card'

describe('Validation des combinaisons', () => {

  // ─── Suites ─────────────────────────────────────────────────────────────────

  describe('Suite', () => {
    it('valide une suite simple de 3 cartes', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('hearts', '8', 0),
        createCard('hearts', '9', 0)
      ]
      expect(validateSuite(cards)).toBe(true)
    })

    it('valide une suite de 5 cartes', () => {
      const cards = [
        createCard('spades', '5', 0),
        createCard('spades', '6', 0),
        createCard('spades', '7', 0),
        createCard('spades', '8', 0),
        createCard('spades', '9', 0)
      ]
      expect(validateSuite(cards)).toBe(true)
    })

    it('invalide une suite avec couleurs mixtes', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('diamonds', '8', 0),
        createCard('hearts', '9', 0)
      ]
      expect(validateSuite(cards)).toBe(false)
    })

    it('invalide une suite de moins de 3 cartes', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('hearts', '8', 0)
      ]
      expect(validateSuite(cards)).toBe(false)
    })

    it('valide une suite avec joker au milieu', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createJoker(0),
        createCard('hearts', '9', 0)
      ]
      expect(validateSuite(cards)).toBe(true)
    })

    it('invalide une suite non consecutive', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('hearts', '9', 0),
        createCard('hearts', 'J', 0)
      ]
      expect(validateSuite(cards)).toBe(false)
    })
  })

  // ─── Brelan ─────────────────────────────────────────────────────────────────

  describe('Brelan', () => {
    it('valide un brelan de 3 cartes differentes couleurs', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('diamonds', '7', 0),
        createCard('spades', '7', 0)
      ]
      expect(validateBrelan(cards)).toBe(true)
    })

    it('invalide un brelan avec 2 cartes meme couleur', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('hearts', '7', 1),
        createCard('spades', '7', 0)
      ]
      expect(validateBrelan(cards)).toBe(false)
    })

    it('invalide un brelan avec rangs differents', () => {
      const cards = [
        createCard('hearts', '7', 0),
        createCard('diamonds', '8', 0),
        createCard('spades', '7', 0)
      ]
      expect(validateBrelan(cards)).toBe(false)
    })
  })

  // ─── Carre ──────────────────────────────────────────────────────────────────

  describe('Carre', () => {
    it('valide un carre des 4 couleurs', () => {
      const cards = [
        createCard('hearts', 'K', 0),
        createCard('diamonds', 'K', 0),
        createCard('clubs', 'K', 0),
        createCard('spades', 'K', 0)
      ]
      expect(validateCarre(cards)).toBe(true)
    })

    it('invalide un carre avec 3 cartes', () => {
      const cards = [
        createCard('hearts', 'K', 0),
        createCard('diamonds', 'K', 0),
        createCard('clubs', 'K', 0)
      ]
      expect(validateCarre(cards)).toBe(false)
    })
  })

  // ─── Points ─────────────────────────────────────────────────────────────────

  describe('Calcul des points', () => {
    it('calcule les points correctement (As=11, J/Q/K=10)', () => {
      const cards = [
        createCard('hearts', 'A', 0),  // 11
        createCard('hearts', 'K', 0),  // 10
        createCard('hearts', '7', 0)   // 7
      ]
      expect(calcPoints(cards)).toBe(28)
    })

    it('le joker compte 0 point', () => {
      const cards = [
        createCard('hearts', '7', 0),  // 7
        createJoker(0),                // 0
        createCard('hearts', '9', 0)   // 9
      ]
      expect(calcPoints(cards)).toBe(16)
    })
  })
})
