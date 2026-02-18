import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'http://localhost:3000/api'

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('token')
}

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(username: string, email: string, password: string) {
  const result = await request<{ player: any; token: string }>(
    '/auth/register', 'POST', { username, email, password }
  )
  await AsyncStorage.setItem('token', result.token)
  await AsyncStorage.setItem('player', JSON.stringify(result.player))
  return result
}

export async function login(email: string, password: string) {
  const result = await request<{ player: any; token: string }>(
    '/auth/login', 'POST', { email, password }
  )
  await AsyncStorage.setItem('token', result.token)
  await AsyncStorage.setItem('player', JSON.stringify(result.player))
  return result
}

export async function getMe() {
  return request<any>('/auth/me')
}

export async function logout() {
  await AsyncStorage.removeItem('token')
  await AsyncStorage.removeItem('player')
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(variant: string, teamMode: boolean, maxPlayers: number) {
  return request<any>('/rooms', 'POST', { variant, teamMode, maxPlayers })
}

export async function getRooms() {
  return request<any[]>('/rooms')
}

export async function getRoomByCode(code: string) {
  return request<any>(`/rooms/${code}`)
}

// ─── Player stocke localement ─────────────────────────────────────────────────

export async function getStoredPlayer() {
  const json = await AsyncStorage.getItem('player')
  return json ? JSON.parse(json) : null
}
