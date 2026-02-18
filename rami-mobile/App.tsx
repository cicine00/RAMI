import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'

import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import LobbyScreen, { GameConfig } from './src/screens/LobbyScreen'
import GameScreen from './src/screens/GameScreen'

type Screen = 'login' | 'home' | 'lobby' | 'game'
type Mode = 'solo' | 'local' | 'online'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home') // DEV: bypass login
  const [gameMode, setGameMode] = useState<Mode>('solo')
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)

  useEffect(() => {
    // DEV: injecter un faux joueur pour le preview
    AsyncStorage.setItem('player', JSON.stringify({
      username: 'TestJoueur',
      total_games: 42,
      total_wins: 17,
      total_score: 850
    }))
  }, [])

  function handleStartMode(mode: Mode) {
    setGameMode(mode)
    setScreen('lobby')
  }

  function handleStartGame(config: GameConfig) {
    setGameConfig(config)
    setScreen('game')
  }

  function handleGameEnd() {
    setGameConfig(null)
    setScreen('home')
  }

  return (
    <>
      <StatusBar style="light" />
      {screen === 'login' && (
        <LoginScreen onLogin={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <HomeScreen
          onStartGame={handleStartMode}
          onLogout={() => setScreen('login')}
        />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          mode={gameMode}
          onStartGame={handleStartGame}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'game' && gameConfig && (
        <GameScreen
          config={gameConfig}
          onGameEnd={handleGameEnd}
        />
      )}
    </>
  )
}
