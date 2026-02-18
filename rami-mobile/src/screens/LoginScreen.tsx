import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import { login, register } from '../services/apiService'

type Props = { onLogin: () => void }

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) return Alert.alert('Erreur', 'Champs requis')
    if (mode === 'register' && !username) return Alert.alert('Erreur', 'Nom requis')

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      onLogin()
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎴</Text>
          <Text style={styles.logoTitle}>RAMI</Text>
          <Text style={styles.logoSub}>Marocain</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
              {loading
                ? <ActivityIndicator color={colors.textLight} />
                : <Text style={styles.buttonText}>
                    {mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoEmoji: { fontSize: 64 },
  logoTitle: { fontSize: 42, fontWeight: '900', color: colors.gold, letterSpacing: 6 },
  logoSub: { fontSize: 16, color: colors.textMuted, letterSpacing: 4, marginTop: -4 },
  form: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  tabs: { flexDirection: 'row', marginBottom: 20, borderRadius: 10, overflow: 'hidden' },
  tab: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.textLight },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: colors.textLight,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 16
  },
  button: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { padding: 16, alignItems: 'center' },
  buttonText: { color: colors.textLight, fontSize: 16, fontWeight: '700' }
})
