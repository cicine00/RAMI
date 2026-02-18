import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import { getStoredPlayer, logout } from '../services/apiService'

type Props = {
  onStartGame: (mode: 'solo' | 'local' | 'online') => void
  onLogout: () => void
}

export default function HomeScreen({ onStartGame, onLogout }: Props) {
  const [player, setPlayer] = useState<any>(null)

  useEffect(() => {
    getStoredPlayer().then(setPlayer)
  }, [])

  async function handleLogout() {
    await logout()
    onLogout()
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid]} style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bienvenue</Text>
          <Text style={styles.username}>{player?.username || '...'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Deconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>🎴</Text>
        <Text style={styles.logoTitle}>RAMI</Text>
        <Text style={styles.logoSub}>Marocain</Text>
      </View>

      {/* Modes de jeu */}
      <View style={styles.modes}>
        <Text style={styles.sectionTitle}>Choisir un mode</Text>

        <TouchableOpacity style={styles.modeCard} onPress={() => onStartGame('solo')}>
          <LinearGradient colors={['#1a5c38', '#0f3d25']} style={styles.modeGradient}>
            <Text style={styles.modeEmoji}>🤖</Text>
            <View>
              <Text style={styles.modeName}>Solo vs IA</Text>
              <Text style={styles.modeDesc}>Jouer contre le CPU</Text>
            </View>
            <Text style={styles.modeArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeCard} onPress={() => onStartGame('local')}>
          <LinearGradient colors={['#16213e', '#0f3460']} style={styles.modeGradient}>
            <Text style={styles.modeEmoji}>👥</Text>
            <View>
              <Text style={styles.modeName}>Local</Text>
              <Text style={styles.modeDesc}>Meme appareil</Text>
            </View>
            <Text style={styles.modeArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeCard} onPress={() => onStartGame('online')}>
          <LinearGradient colors={['#7b0000', '#c0392b']} style={styles.modeGradient}>
            <Text style={styles.modeEmoji}>🌐</Text>
            <View>
              <Text style={styles.modeName}>En ligne</Text>
              <Text style={styles.modeDesc}>Multijoueur</Text>
            </View>
            <Text style={styles.modeArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {player && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{player.total_games || 0}</Text>
            <Text style={styles.statLabel}>Parties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{player.total_wins || 0}</Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{player.total_score || 0}</Text>
            <Text style={styles.statLabel}>Score total</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 50, marginBottom: 20
  },
  welcome: { color: colors.textMuted, fontSize: 13 },
  username: { color: colors.textLight, fontSize: 18, fontWeight: '700' },
  logout: { color: colors.textMuted, fontSize: 13 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 48 },
  logoTitle: { fontSize: 36, fontWeight: '900', color: colors.gold, letterSpacing: 6 },
  logoSub: { fontSize: 13, color: colors.textMuted, letterSpacing: 4 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 2 },
  modes: { flex: 1 },
  modeCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  modeGradient: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, gap: 16
  },
  modeEmoji: { fontSize: 32 },
  modeName: { color: colors.textLight, fontSize: 17, fontWeight: '700' },
  modeDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  modeArrow: { color: colors.textMuted, fontSize: 24, marginLeft: 'auto' },
  stats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 12
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' }
})
