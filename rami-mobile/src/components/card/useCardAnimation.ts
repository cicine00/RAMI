import { useState, useCallback } from 'react'
import { AnimationConfig, AnimationType } from './AnimatedCard'
import { CardData } from './CardView'

// ─── State d'une carte animee ─────────────────────────────────────────────────

export interface AnimatedCardState {
  card: CardData
  animation: AnimationConfig
  key: string // cle unique pour forcer le re-render
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useCardAnimation() {
  const [drawingCard, setDrawingCard]     = useState<AnimatedCardState | null>(null)
  const [discardingCard, setDiscardingCard] = useState<AnimatedCardState | null>(null)
  const [playingCards, setPlayingCards]   = useState<AnimatedCardState[]>([])

  // ─── Animation pioche : carte vole du talon vers la main ─────────────────
  const animateDraw = useCallback((card: CardData, onComplete?: () => void) => {
    setDrawingCard({
      card,
      key: `draw_${Date.now()}`,
      animation: {
        type: 'draw',
        fromPosition: { x: -250, y: -180 }, // position du talon relative a la main
        delay: 0,
        onComplete: () => {
          setDrawingCard(null)
          onComplete?.()
        }
      }
    })
  }, [])

  // ─── Animation defausse : carte vole vers la zone defausse ───────────────
  const animateDiscard = useCallback((card: CardData, onComplete?: () => void) => {
    setDiscardingCard({
      card,
      key: `discard_${Date.now()}`,
      animation: {
        type: 'discard',
        toPosition: { x: -200, y: -200 }, // position de la defausse relative a la main
        delay: 0,
        onComplete: () => {
          setDiscardingCard(null)
          onComplete?.()
        }
      }
    })
  }, [])

  // ─── Animation pose : cartes volent vers la table ─────────────────────────
  const animatePlay = useCallback((cards: CardData[], onComplete?: () => void) => {
    const animated = cards.map((card, i) => ({
      card,
      key: `play_${Date.now()}_${i}`,
      animation: {
        type: 'play' as AnimationType,
        toPosition: { x: (i - cards.length / 2) * 60, y: -250 },
        delay: i * 80, // delai en cascade
        onComplete: i === cards.length - 1 ? () => {
          setPlayingCards([])
          onComplete?.()
        } : undefined
      }
    }))
    setPlayingCards(animated)
  }, [])

  // ─── Animation distribution initiale ─────────────────────────────────────
  const animateDeal = useCallback((cards: CardData[], onComplete?: () => void) => {
    const animated = cards.map((card, i) => ({
      card,
      key: `deal_${Date.now()}_${i}`,
      animation: {
        type: 'deal' as AnimationType,
        fromPosition: { x: -200, y: -300 },
        delay: i * 120, // une carte toutes les 120ms
        onComplete: i === cards.length - 1 ? onComplete : undefined
      }
    }))
    setPlayingCards(animated)
  }, [])

  return {
    drawingCard,
    discardingCard,
    playingCards,
    animateDraw,
    animateDiscard,
    animatePlay,
    animateDeal
  }
}
