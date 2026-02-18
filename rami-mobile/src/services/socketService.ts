import { io, Socket } from 'socket.io-client'

const BACKEND_URL = 'http://localhost:3000'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket']
  })

  socket.on('connect', () => console.log('Socket connecte'))
  socket.on('disconnect', () => console.log('Socket deconnecte'))
  socket.on('connect_error', (err) => console.error('Erreur socket:', err.message))

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
