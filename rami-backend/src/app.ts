import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './auth/auth.routes'
import roomRoutes from './room/room.routes'
import { setupSocketHandlers } from './socket/socketHandler'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ─── Routes REST ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Socket.io handlers ───────────────────────────────────────────────────────
setupSocketHandlers(io)

// ─── Demarrer le serveur ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Serveur Rami demarre sur le port ${PORT}`)
})

export { app, io }
