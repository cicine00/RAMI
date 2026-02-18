import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import CardView, { CardData } from './CardView'

// ─── Types d'animation ────────────────────────────────────────────────────────

export type AnimationType = 'none' | 'draw' | 'discard' | 'play' | 'deal'

export interface AnimationConfig {
  type: AnimationType
  fromPosition?: { x: number; y: number }
  toPosition?: { x: number; y: number }
  delay?: number
  onComplete?: () => void
}

type Props = {
  card: CardData
  selected?: boolean
  onPress?: () => void
  size?: 'small' | 'normal' | 'large'
  disabled?: boolean
  animation?: AnimationConfig
}

export default function AnimatedCard({
  card, selected = false, onPress, size = 'normal',
  disabled = false, animation
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const opacity    = useRef(new Animated.Value(1)).current
  const scale      = useRef(new Animated.Value(1)).current
  const rotateZ    = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!animation || animation.type === 'none') return

    // Reset
    translateX.setValue(animation.fromPosition?.x || 0)
    translateY.setValue(animation.fromPosition?.y || 0)
    opacity.setValue(1)
    scale.setValue(1)
    rotateZ.setValue(0)

    const delay = animation.delay || 0

    switch (animation.type) {

      // ─── Pioche : carte vole du talon vers la main ─────────────────────────
      case 'draw': {
        const fromX = animation.fromPosition?.x || 0
        const fromY = animation.fromPosition?.y || -300
        translateX.setValue(fromX)
        translateY.setValue(fromY)
        scale.setValue(0.7)
        opacity.setValue(0.8)

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 80, friction: 8,
              useNativeDriver: true
            }),
            Animated.spring(translateY, {
              toValue: 0,
              tension: 80, friction: 8,
              useNativeDriver: true
            }),
            Animated.spring(scale, {
              toValue: 1,
              tension: 80, friction: 8,
              useNativeDriver: true
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            })
          ])
        ]).start(animation.onComplete)
        break
      }

      // ─── Defausse : carte vole de la main vers la defausse ─────────────────
      case 'discard': {
        const toX = animation.toPosition?.x || 0
        const toY = animation.toPosition?.y || -200

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: toX,
              tension: 100, friction: 8,
              useNativeDriver: true
            }),
            Animated.spring(translateY, {
              toValue: toY,
              tension: 100, friction: 8,
              useNativeDriver: true
            }),
            Animated.timing(rotateZ, {
              toValue: (Math.random() - 0.5) * 30, // legere rotation aleatoire
              duration: 300,
              useNativeDriver: true
            }),
            Animated.timing(scale, {
              toValue: 0.85,
              duration: 300,
              useNativeDriver: true
            })
          ])
        ]).start(animation.onComplete)
        break
      }

      // ─── Pose sur table : carte glisse vers la zone table ─────────────────
      case 'play': {
        const toX = animation.toPosition?.x || 0
        const toY = animation.toPosition?.y || -150

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: toX,
              tension: 70, friction: 7,
              useNativeDriver: true
            }),
            Animated.spring(translateY, {
              toValue: toY,
              tension: 70, friction: 7,
              useNativeDriver: true
            }),
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 1.15,
                duration: 150,
                useNativeDriver: true
              }),
              Animated.spring(scale, {
                toValue: 1,
                tension: 120, friction: 8,
                useNativeDriver: true
              })
            ])
          ])
        ]).start(animation.onComplete)
        break
      }

      // ─── Distribution : cartes arrivent une par une ────────────────────────
      case 'deal': {
        const fromX = animation.fromPosition?.x || 0
        const fromY = animation.fromPosition?.y || -400
        translateX.setValue(fromX)
        translateY.setValue(fromY)
        opacity.setValue(0)
        scale.setValue(0.5)

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 60, friction: 8,
              useNativeDriver: true
            }),
            Animated.spring(translateY, {
              toValue: 0,
              tension: 60, friction: 8,
              useNativeDriver: true
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true
            }),
            Animated.spring(scale, {
              toValue: 1,
              tension: 60, friction: 8,
              useNativeDriver: true
            })
          ])
        ]).start(animation.onComplete)
        break
      }
    }
  }, [animation?.type, animation?.delay])

  const rotateStr = rotateZ.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg']
  })

  return (
    <Animated.View style={[
      styles.container,
      {
        transform: [
          { translateX },
          { translateY },
          { scale },
          { rotate: rotateStr }
        ],
        opacity
      }
    ]}>
      <CardView
        card={card}
        selected={selected}
        onPress={onPress}
        size={size}
        disabled={disabled}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Necessite position relative pour que les transforms fonctionnent
  }
})
