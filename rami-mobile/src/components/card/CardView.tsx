import React, { useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { colors } from '../../theme/colors'

export interface CardData {
  id: string
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | null
  rank: string | null
  isJoker: boolean
  points: number
  hidden?: boolean
}

type Props = {
  card: CardData
  selected?: boolean
  onPress?: () => void
  size?: 'small' | 'normal' | 'large'
  disabled?: boolean
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  spades:   '♠'
}

const SUIT_COLORS: Record<string, string> = {
  hearts:   colors.hearts,
  diamonds: colors.diamonds,
  clubs:    colors.clubs,
  spades:   colors.spades
}

const SIZES = {
  small:  { width: 42,  height: 58,  rankSize: 13, suitSize: 14, borderRadius: 6  },
  normal: { width: 58,  height: 80,  rankSize: 16, suitSize: 18, borderRadius: 8  },
  large:  { width: 72,  height: 100, rankSize: 18, suitSize: 22, borderRadius: 10 }
}

export default function CardView({ card, selected = false, onPress, size = 'normal', disabled = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current

  const animatedStyle = { transform: [{ scale }] }

  function handlePress() {
    if (disabled || !onPress) return
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true })
    ]).start()
    onPress()
  }

  const dim = SIZES[size]

  // Carte cachee (adversaire)
  if (card.hidden) {
    return (
      <Animated.View style={[animatedStyle, styles.card, {
        width: dim.width, height: dim.height, borderRadius: dim.borderRadius,
        backgroundColor: colors.cardBack
      }]}>
        <View style={styles.cardBackPattern}>
          <Text style={{ fontSize: dim.suitSize, opacity: 0.3 }}>🎴</Text>
        </View>
      </Animated.View>
    )
  }

  // Joker
  if (card.isJoker) {
    return (
      <TouchableOpacity onPress={handlePress} disabled={disabled || !onPress} activeOpacity={0.8}>
        <Animated.View style={[
          animatedStyle, styles.card,
          { width: dim.width, height: dim.height, borderRadius: dim.borderRadius, backgroundColor: colors.cardFace },
          selected && styles.cardSelected
        ]}>
          <Text style={[styles.rankText, { fontSize: dim.rankSize, color: colors.joker }]}>J</Text>
          <Text style={{ fontSize: dim.suitSize * 1.2 }}>🃏</Text>
          <Text style={[styles.rankText, { fontSize: dim.rankSize, color: colors.joker, transform: [{ rotate: '180deg' }] }]}>J</Text>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit!] || ''
  const suitColor = SUIT_COLORS[card.suit!] || colors.clubs

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled || !onPress} activeOpacity={0.8}>
      <Animated.View style={[
        animatedStyle, styles.card,
        { width: dim.width, height: dim.height, borderRadius: dim.borderRadius, backgroundColor: colors.cardFace },
        selected && styles.cardSelected
      ]}>
        {/* Coin haut gauche */}
        <View style={styles.corner}>
          <Text style={[styles.rankText, { fontSize: dim.rankSize, color: suitColor }]}>{card.rank}</Text>
          <Text style={[styles.suitText, { fontSize: dim.rankSize - 2, color: suitColor }]}>{suitSymbol}</Text>
        </View>

        {/* Centre */}
        <Text style={[styles.centerSuit, { fontSize: dim.suitSize * 1.5, color: suitColor }]}>
          {suitSymbol}
        </Text>

        {/* Coin bas droit (retourne) */}
        <View style={[styles.corner, styles.cornerBottom]}>
          <Text style={[styles.rankText, { fontSize: dim.rankSize, color: suitColor }]}>{card.rank}</Text>
          <Text style={[styles.suitText, { fontSize: dim.rankSize - 2, color: suitColor }]}>{suitSymbol}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    margin: 2
  },
  cardSelected: {
    borderColor: colors.selectedCard,
    borderWidth: 2,
    shadowColor: colors.selectedCard,
    shadowOpacity: 0.6,
    transform: [{ translateY: -8 }]
  },
  cardBackPattern: {
    flex: 1, alignItems: 'center', justifyContent: 'center'
  },
  corner: {
    position: 'absolute', top: 4, left: 5, alignItems: 'center'
  },
  cornerBottom: {
    top: undefined, left: undefined, bottom: 4, right: 5,
    transform: [{ rotate: '180deg' }]
  },
  rankText: { fontWeight: '800', lineHeight: 16 },
  suitText: { lineHeight: 14 },
  centerSuit: { fontWeight: '900' }
})
