import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, SafeAreaView
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import CardView, { CardData } from '../components/card/CardView'
import { GameConfig } from './LobbyScreen'
import { getSocket, connectSocket } from '../services/socketService'
import { getStoredPlayer, getMe } from '../services/apiService'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Props = {
  config: GameConfig
  onGameEnd: () => void
}

type GamePhase = 'waiting' | 'dealing' | 'playing' | 'finished'
type TurnStep = 'draw' | 'play' | 'discard'

interface PlayerState {
  name: string
  hand: CardData[]
  hasOpened: boolean
  openingPoints: number
  score: number
  isDealer: boolean
}

interface TableCombo {
  combination: { cards: CardData[]; type: string; points: number }
  playerId: string
}

interface GameState {
  phase: GamePhase
  players: PlayerState[]
  discardPile: CardData[]
  tableCombinations: TableCombo[]
  currentPlayerIndex: number
  turnAction: string
  winnerId: string | null
}

export default function GameScreen({ config, onGameEnd }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myName, setMyName] = useState('')
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [turnStep, setTurnStep] = useState<TurnStep>('draw')
  const [message, setMessage] = useState('')
  const [roomCode, setRoomCode] = useState(config.roomCode || '')

  const myPlayer = gameState?.players.find(p => p.name === myName)
  const isMyTurn = gameState
    ? gameState.players[gameState.currentPlayerIndex]?.name === myName
    : false

  useEffect(() => {
    initGame()
  }, [])

  async function initGame() {
    const player = await getStoredPlayer()
    const name = player?.username || 'TestJoueur'
    if (player) setMyName(name)

    // DEV: mock game state pour preview sans backend
    const mockHand: CardData[] = [
      { id: 'h7', suit: 'hearts',   rank: '7',  isJoker: false, points: 7  },
      { id: 'h8', suit: 'hearts',   rank: '8',  isJoker: false, points: 8  },
      { id: 'h9', suit: 'hearts',   rank: '9',  isJoker: false, points: 9  },
      { id: 'hK', suit: 'hearts',   rank: 'K',  isJoker: false, points: 10 },
      { id: 'dA', suit: 'diamonds', rank: 'A',  isJoker: false, points: 11 },
      { id: 'sA', suit: 'spades',   rank: 'A',  isJoker: false, points: 11 },
      { id: 'cA', suit: 'clubs',    rank: 'A',  isJoker: false, points: 11 },
      { id: 'd9', suit: 'diamonds', rank: '9',  isJoker: false, points: 9  },
      { id: 's5', suit: 'spades',   rank: '5',  isJoker: false, points: 5  },
      { id: 'c3', suit: 'clubs',    rank: '3',  isJoker: false, points: 3  },
      { id: 'hJ', suit: 'hearts',   rank: 'J',  isJoker: false, points: 10 },
      { id: 'dQ', suit: 'diamonds', rank: 'Q',  isJoker: false, points: 10 },
      { id: 's2', suit: 'spades',   rank: '2',  isJoker: false, points: 2  },
      { id: 'c6', suit: 'clubs',    rank: '6',  isJoker: false, points: 6  },
    ]
    const mockState: GameState = {
      phase: 'playing',
      players: [
        { name, hand: mockHand, hasOpened: false, openingPoints: 0, score: 0, isDealer: false },
        { name: 'IA Moyen', hand: Array(14).fill({ id: 'x', suit: null, rank: null, isJoker: false, points: 0, hidden: true }), hasOpened: false, openingPoints: 0, score: 0, isDealer: true }
      ],
      discardPile: [{ id: 'disc', suit: 'clubs', rank: 'Q', isJoker: false, points: 10 }],
      tableCombinations: [],
      currentPlayerIndex: 0,
      turnAction: 'draw_then_play',
      winnerId: null
    }
    setGameState(mockState)
    setMessage("C'est votre tour !")
    setTurnStep('draw')
    return // DEV: ne pas connecter au socket
    // --- code reel en dessous ---
    if (config.mode === 'online') {
      const token = await AsyncStorage.getItem('token')
      if (!token) return
      const socket = connectSocket(token)
      setupSocketListeners(socket, player)
    } else {
      const token = await AsyncStorage.getItem('token')
      if (!token) return
      const socket = connectSocket(token)
      setupSocketListeners(socket, player)
      startLocalGame(socket, player)
    }
  }

  function setupSocketListeners(socket: any, player: any) {
    socket.on('game:started', (state: GameState) => {
      setGameState(state)
      setTurnStep(state.turnAction === 'discard_only' ? 'discard' : 'draw')
      setMessage('Partie demarree !')
    })

    socket.on('game:state_updated', (state: GameState) => {
      setGameState(state)
      setSelectedCards(new Set())
      const currentPlayer = state.players[state.currentPlayerIndex]
      if (currentPlayer?.name === player?.username) {
        setTurnStep(state.turnAction === 'discard_only' ? 'discard' : 'draw')
        setMessage('C\'est votre tour !')
      } else {
        setTurnStep('draw')
        setMessage(`Tour de ${currentPlayer?.name}...`)
      }
    })

    socket.on('game:card_drawn', ({ card }: { card: CardData }) => {
      setTurnStep('play')
      setMessage('Posez des combinaisons ou defaussez')
    })

    socket.on('game:error', ({ message: msg }: { message: string }) => {
      Alert.alert('Action invalide', msg)
    })

    socket.on('game:finished', ({ winnerId, scores }: any) => {
      const winnerScore = scores.find((s: any) => s.name === myName)
      Alert.alert(
        winnerId ? `🏆 ${scores.find((s: any) => s.id === winnerId)?.name || 'Gagnant'}` : 'Partie terminee',
        scores.map((s: any) => `${s.name}: ${s.score} pts`).join('\n'),
        [{ text: 'OK', onPress: onGameEnd }]
      )
    })
  }

  function startLocalGame(socket: any, player: any) {
    const aiPlayers = Array.from({ length: config.playerCount - 1 }, (_, i) => ({
      socketId: '',
      playerId: `ai_${i}`,
      username: `IA ${i + 1}`,
      aiLevel: config.aiLevel || 'medium'
    }))

    const roomId = `local_${Date.now()}`
    setRoomCode(roomId)

    socket.emit('room:start', {
      roomId,
      variant: config.variant,
      teamMode: config.teamMode,
      mode: config.mode,
      players: [
        { socketId: socket.id, playerId: player.id, username: player.username },
        ...aiPlayers
      ]
    })
  }

  function toggleCardSelection(cardId: string) {
    setSelectedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  function handleDrawDeck() {
    const socket = getSocket()
    if (!socket || !isMyTurn) return
    socket.emit('game:draw_deck', { roomId: roomCode })
    setTurnStep('play')
  }

  function handleDrawDiscard() {
    const socket = getSocket()
    if (!socket || !isMyTurn) return
    socket.emit('game:draw_discard', { roomId: roomCode })
    setTurnStep('play')
  }

  function handlePlaySelected() {
    const socket = getSocket()
    if (!socket || !isMyTurn || selectedCards.size === 0) return

    const cards = myPlayer?.hand.filter(c => selectedCards.has(c.id)) || []
    socket.emit('game:play_combinations', {
      roomId: roomCode,
      combinations: [cards]
    })
    setSelectedCards(new Set())
  }

  function handleDiscard() {
    const socket = getSocket()
    if (!socket || !isMyTurn || selectedCards.size !== 1) {
      Alert.alert('Defausse', 'Selectionnez exactement 1 carte a defausser')
      return
    }
    const cardId = Array.from(selectedCards)[0]
    socket.emit('game:discard', { roomId: roomCode, cardId })
    setSelectedCards(new Set())
    setTurnStep('draw')
  }

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Chargement de la partie...</Text>
      </View>
    )
  }

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1]
  const opponents = gameState.players.filter(p => p.name !== myName)

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.tableEdge, colors.tableFelt]} style={StyleSheet.absoluteFill} />

      {/* Zone adversaires */}
      <View style={styles.opponentsZone}>
        {opponents.map((opp, i) => (
          <View key={i} style={styles.opponentInfo}>
            <Text style={styles.opponentName}>{opp.name}</Text>
            <View style={styles.opponentHand}>
              {opp.hand.slice(0, 8).map((c, j) => (
                <CardView key={j} card={c} size="small" />
              ))}
              {opp.hand.length > 8 && (
                <Text style={styles.moreCards}>+{opp.hand.length - 8}</Text>
              )}
            </View>
            <Text style={styles.opponentCards}>{opp.hand.length} cartes</Text>
          </View>
        ))}
      </View>

      {/* Zone centrale : talon + defausse + combos sur table */}
      <View style={styles.tableZone}>
        {/* Talon */}
        <TouchableOpacity
          onPress={handleDrawDeck}
          disabled={!isMyTurn || turnStep !== 'draw'}
        >
          <View style={[styles.deck, (!isMyTurn || turnStep !== 'draw') && styles.disabled]}>
            <Text style={styles.deckText}>🂠</Text>
            <Text style={styles.deckCount}>{gameState.discardPile.length}</Text>
          </View>
        </TouchableOpacity>

        {/* Defausse */}
        {topDiscard && (
          <TouchableOpacity
            onPress={handleDrawDiscard}
            disabled={!isMyTurn || turnStep !== 'draw'}
          >
            <View style={[(!isMyTurn || turnStep !== 'draw') && styles.disabled]}>
              <CardView card={topDiscard} size="normal" />
            </View>
          </TouchableOpacity>
        )}

        {/* Combos sur table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          {gameState.tableCombinations.map((tc, i) => (
            <View key={i} style={styles.tableCombo}>
              <View style={styles.tableComboCards}>
                {tc.combination.cards.map((c, j) => (
                  <CardView key={j} card={c} size="small" />
                ))}
              </View>
              <Text style={styles.tableComboPoints}>{tc.combination.points}pts</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Message */}
      <View style={styles.messageZone}>
        <Text style={[styles.message, isMyTurn && styles.messageActive]}>{message}</Text>
        {myPlayer && (
          <Text style={styles.openingStatus}>
            {myPlayer.hasOpened ? `✅ Ouvert (${myPlayer.openingPoints}pts)` : '❌ Pas encore ouvert'}
          </Text>
        )}
      </View>

      {/* Main du joueur */}
      <View style={styles.handZone}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.hand}>
            {myPlayer?.hand.map(card => (
              <CardView
                key={card.id}
                card={card}
                selected={selectedCards.has(card.id)}
                onPress={() => toggleCardSelection(card.id)}
                size="normal"
                disabled={!isMyTurn}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Boutons d'action */}
      {isMyTurn && (
        <View style={styles.actions}>
          {turnStep === 'play' || turnStep === 'discard' ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.playBtn, selectedCards.size < 3 && styles.btnDisabled]}
                onPress={handlePlaySelected}
                disabled={selectedCards.size < 3}
              >
                <Text style={styles.actionBtnText}>
                  Poser ({selectedCards.size})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.discardBtn, selectedCards.size !== 1 && styles.btnDisabled]}
                onPress={handleDiscard}
                disabled={selectedCards.size !== 1}
              >
                <Text style={styles.actionBtnText}>Defausser</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
  loadingText: { color: colors.textLight, fontSize: 16 },
  opponentsZone: { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opponentInfo: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    padding: 8, flex: 1, minWidth: 140
  },
  opponentName: { color: colors.textLight, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  opponentHand: { flexDirection: 'row', flexWrap: 'wrap' },
  opponentCards: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  moreCards: { color: colors.textMuted, fontSize: 11, alignSelf: 'center', marginLeft: 4 },
  tableZone: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16, paddingHorizontal: 12
  },
  deck: {
    width: 58, height: 80, backgroundColor: colors.cardBack,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.gold
  },
  deckText: { fontSize: 32 },
  deckCount: { color: colors.textLight, fontSize: 10, marginTop: 2 },
  disabled: { opacity: 0.4 },
  tableScroll: { flex: 1 },
  tableCombo: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    padding: 6, marginRight: 8, alignItems: 'center'
  },
  tableComboCards: { flexDirection: 'row' },
  tableComboPoints: { color: colors.gold, fontSize: 10, marginTop: 2 },
  messageZone: { alignItems: 'center', paddingVertical: 8 },
  message: { color: colors.textMuted, fontSize: 14 },
  messageActive: { color: colors.gold, fontWeight: '700' },
  openingStatus: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  handZone: { paddingVertical: 8 },
  hand: { flexDirection: 'row', paddingHorizontal: 10 },
  actions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 16
  },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  playBtn: { backgroundColor: colors.success },
  discardBtn: { backgroundColor: colors.primary },
  btnDisabled: { opacity: 0.4 },
  actionBtnText: { color: colors.textLight, fontWeight: '700', fontSize: 14 }
})
