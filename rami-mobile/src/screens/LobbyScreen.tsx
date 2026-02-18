import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, ScrollView
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import { createRoom } from '../services/apiService'

type Mode = 'solo' | 'local' | 'online'

type Props = {
  mode: Mode
  onStartGame: (config: GameConfig) => void
  onBack: () => void
}

export interface GameConfig {
  variant: 'classique' | 'avecJokers'
  playerCount: number
  teamMode: boolean
  aiLevel?: 'easy' | 'medium' | 'hard'
  mode: Mode
  roomCode?: string
}

export default function LobbyScreen({ mode, onStartGame, onBack }: Props) {
  const [variant, setVariant] = useState<'classique' | 'avecJokers'>('classique')
  const [playerCount, setPlayerCount] = useState(2)
  const [teamMode, setTeamMode] = useState(false)
  const [aiLevel, setAiLevel] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    try {
      let code: string | undefined

      if (mode === 'online') {
        const room = await createRoom(variant, teamMode, playerCount)
        code = room.code
      }

      onStartGame({ variant, playerCount, teamMode, aiLevel, mode, roomCode: code })
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!roomCode.trim()) return Alert.alert('Erreur', 'Entrer le code de la salle')
    onStartGame({ variant, playerCount, teamMode, aiLevel, mode, roomCode: roomCode.toUpperCase() })
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'solo' ? '🤖 Solo' : mode === 'local' ? '👥 Local' : '🌐 En ligne'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Variante */}
        <Text style={styles.label}>Variante</Text>
        <View style={styles.row}>
          {(['classique', 'avecJokers'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.option, variant === v && styles.optionActive]}
              onPress={() => setVariant(v)}
            >
              <Text style={styles.optionEmoji}>{v === 'classique' ? '🃏' : '🃏✨'}</Text>
              <Text style={[styles.optionText, variant === v && styles.optionTextActive]}>
                {v === 'classique' ? 'Classique' : 'Avec Jokers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nombre de joueurs */}
        <Text style={styles.label}>Joueurs</Text>
        <View style={styles.row}>
          {[2, 3, 4].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.optionSmall, playerCount === n && styles.optionActive]}
              onPress={() => {
                setPlayerCount(n)
                if (n !== 4) setTeamMode(false)
              }}
            >
              <Text style={[styles.optionText, playerCount === n && styles.optionTextActive]}>
                {n} joueurs
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode equipe (seulement a 4) */}
        {playerCount === 4 && (
          <>
            <Text style={styles.label}>Mode</Text>
            <View style={styles.row}>
              {[false, true].map(tm => (
                <TouchableOpacity
                  key={String(tm)}
                  style={[styles.option, teamMode === tm && styles.optionActive]}
                  onPress={() => setTeamMode(tm)}
                >
                  <Text style={styles.optionEmoji}>{tm ? '🤝' : '⚔️'}</Text>
                  <Text style={[styles.optionText, teamMode === tm && styles.optionTextActive]}>
                    {tm ? 'Equipes 2v2' : 'Solo chacun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Niveau IA (mode solo) */}
        {mode === 'solo' && (
          <>
            <Text style={styles.label}>Difficulte IA</Text>
            <View style={styles.row}>
              {([
                { key: 'easy', label: 'Facile', emoji: '😊' },
                { key: 'medium', label: 'Moyen', emoji: '🎯' },
                { key: 'hard', label: 'Difficile', emoji: '💀' }
              ] as const).map(({ key, label, emoji }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionSmall, aiLevel === key && styles.optionActive]}
                  onPress={() => setAiLevel(key)}
                >
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                  <Text style={[styles.optionText, aiLevel === key && styles.optionTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Mode online : creer ou rejoindre */}
        {mode === 'online' && (
          <>
            <Text style={styles.label}>Rejoindre une salle</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="Code (ex: AB1C2D)"
                placeholderTextColor={colors.textMuted}
                value={roomCode}
                onChangeText={setRoomCode}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                <Text style={styles.joinButtonText}>Rejoindre</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.orText}>— ou —</Text>
          </>
        )}

        {/* Bouton demarrer */}
        <TouchableOpacity style={styles.startButton} onPress={handleStart} disabled={loading}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.startGradient}>
            <Text style={styles.startText}>
              {mode === 'online' ? '🌐 Creer la salle' : '🎮 Demarrer'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 50, marginBottom: 24, gap: 16 },
  back: { color: colors.primary, fontSize: 20, fontWeight: '600' },
  title: { color: colors.textLight, fontSize: 20, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 20 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  option: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  optionSmall: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  optionActive: { backgroundColor: 'rgba(192,57,43,0.3)', borderColor: colors.primary },
  optionEmoji: { fontSize: 24, marginBottom: 6 },
  optionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  optionTextActive: { color: colors.textLight },
  joinRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14, color: colors.textLight, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', fontSize: 18,
    fontWeight: '800', letterSpacing: 4
  },
  joinButton: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    padding: 14, justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  joinButtonText: { color: colors.textLight, fontWeight: '700' },
  orText: { color: colors.textMuted, textAlign: 'center', marginVertical: 16 },
  startButton: { borderRadius: 16, overflow: 'hidden', marginTop: 24, marginBottom: 40 },
  startGradient: { padding: 18, alignItems: 'center' },
  startText: { color: colors.textLight, fontSize: 17, fontWeight: '800' }
})
