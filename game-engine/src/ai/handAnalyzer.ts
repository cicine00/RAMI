import { Card } from '../types'
import { RANK_ORDER } from '../card'
import { validateSuite, validateBrelan, validateCarre, calcPoints } from '../combination'
import { HandAnalysis } from './aiTypes'

// ─── Trouver toutes les suites possibles dans une main ───────────────────────

function findSuites(hand: Card[]): Card[][] {
  const suites: Card[][] = []
  const bySuit = new Map<string, Card[]>()

  // Grouper par couleur
  for (const card of hand) {
    if (card.isJoker) continue
    const suit = card.suit!
    if (!bySuit.has(suit)) bySuit.set(suit, [])
    bySuit.get(suit)!.push(card)
  }

  const jokers = hand.filter(c => c.isJoker)

  bySuit.forEach((cards) => {
    // Trier par rang
    const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank!] - RANK_ORDER[b.rank!])

    // Chercher toutes les suites de 3+ cartes consecutives
    for (let start = 0; start < sorted.length; start++) {
      let group = [sorted[start]]
      let jokersUsed = 0

      for (let i = start + 1; i < sorted.length; i++) {
        const gap = RANK_ORDER[sorted[i].rank!] - RANK_ORDER[group[group.length - 1].rank!] - 1

        if (gap === 0) {
          // Consecutive directement
          group.push(sorted[i])
        } else if (gap <= jokers.length - jokersUsed) {
          // Combler avec jokers
          for (let g = 0; g < gap; g++) {
            group.push(jokers[jokersUsed + g])
          }
          jokersUsed += gap
          group.push(sorted[i])
        } else {
          break
        }
      }

      if (group.length >= 3) {
        suites.push(group)
      }
    }
  })

  return suites
}

// ─── Trouver tous les brelans/carres possibles ───────────────────────────────

function findSetsOfKind(hand: Card[]): Card[][] {
  const sets: Card[][] = []
  const byRank = new Map<string, Card[]>()

  for (const card of hand) {
    if (card.isJoker) continue
    const rank = card.rank!
    if (!byRank.has(rank)) byRank.set(rank, [])
    byRank.get(rank)!.push(card)
  }

  const jokers = hand.filter(c => c.isJoker)

  byRank.forEach((cards) => {
    // Verifier couleurs uniques pour brelan/carre
    const uniqueSuit = cards.filter((c, i, arr) =>
      arr.findIndex(x => x.suit === c.suit) === i
    )

    if (uniqueSuit.length >= 3) {
      sets.push(uniqueSuit.slice(0, 3)) // brelan
      if (uniqueSuit.length === 4) {
        sets.push(uniqueSuit) // carre
      }
    } else if (uniqueSuit.length === 2 && jokers.length > 0) {
      // Brelan avec joker
      sets.push([...uniqueSuit, jokers[0]])
    }
  })

  return sets
}

// ─── Trouver les groupes partiels (2 cartes) ─────────────────────────────────

function findPartialGroups(hand: Card[]): Card[][] {
  const partials: Card[][] = []
  const byRank = new Map<string, Card[]>()
  const bySuit = new Map<string, Card[]>()

  for (const card of hand) {
    if (card.isJoker) continue
    if (!byRank.has(card.rank!)) byRank.set(card.rank!, [])
    byRank.get(card.rank!)!.push(card)
    if (!bySuit.has(card.suit!)) bySuit.set(card.suit!, [])
    bySuit.get(card.suit!)!.push(card)
  }

  // Paires de meme rang (debut de brelan)
  byRank.forEach((cards) => {
    if (cards.length >= 2) partials.push(cards.slice(0, 2))
  })

  // Cartes consecutives meme couleur (debut de suite)
  bySuit.forEach((cards) => {
    const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank!] - RANK_ORDER[b.rank!])
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = RANK_ORDER[sorted[i + 1].rank!] - RANK_ORDER[sorted[i].rank!]
      if (gap <= 2) { // consecutif ou 1 trou
        partials.push([sorted[i], sorted[i + 1]])
      }
    }
  })

  return partials
}

// ─── Trouver les meilleures combos pour l'ouverture (71pts) ──────────────────

function findBestOpeningCombos(validCombos: Card[][], minPoints: number): Card[][] {
  // Tester toutes les combinaisons possibles de combos pour atteindre minPoints
  const n = validCombos.length
  let bestSelection: Card[][] = []
  let bestPoints = 0

  for (let mask = 1; mask < (1 << n); mask++) {
    const selected: Card[][] = []
    let points = 0
    let hasSuite = false

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        selected.push(validCombos[i])
        points += calcPoints(validCombos[i])
        if (validateSuite(validCombos[i])) hasSuite = true
      }
    }

    if (points >= minPoints && hasSuite) {
      if (bestSelection.length === 0 || points < bestPoints) {
        bestSelection = selected
        bestPoints = points
      }
    }
  }

  return bestSelection
}

// ─── Analyser la main complete ────────────────────────────────────────────────

export function analyzeHand(hand: Card[], minOpeningPoints: number): HandAnalysis {
  const validSuites = findSuites(hand)
  const validSets = findSetsOfKind(hand)
  const validCombinations = [...validSuites, ...validSets]

  const usedCardIds = new Set<string>()
  validCombinations.forEach(combo => combo.forEach(c => usedCardIds.add(c.id)))

  const partialGroups = findPartialGroups(
    hand.filter(c => !usedCardIds.has(c.id))
  )

  const partialIds = new Set<string>()
  partialGroups.forEach(g => g.forEach(c => partialIds.add(c.id)))

  const loneCards = hand.filter(
    c => !usedCardIds.has(c.id) && !partialIds.has(c.id)
  )

  const bestOpeningCombos = findBestOpeningCombos(validCombinations, minOpeningPoints)

  return {
    validCombinations,
    partialGroups,
    loneCards,
    totalPoints: calcPoints(hand),
    bestOpeningCombos
  }
}

// ─── Choisir la carte a defausser ─────────────────────────────────────────────

export function chooseCardToDiscard(hand: Card[], analysis: HandAnalysis): Card {
  // Priorite : cartes isolees avec le moins de points
  if (analysis.loneCards.length > 0) {
    return analysis.loneCards.reduce((min, c) =>
      c.points < min.points ? c : min
    )
  }

  // Sinon : carte du groupe partiel avec le moins de valeur
  if (analysis.partialGroups.length > 0) {
    const allPartial = analysis.partialGroups.flat()
    return allPartial.reduce((min, c) =>
      c.points < min.points ? c : min
    )
  }

  // Dernier recours : carte avec le moins de points
  return hand.reduce((min, c) => c.points < min.points ? c : min)
}
