import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool'

const SALT_ROUNDS = 10

export interface RegisterDto {
  username: string
  email: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface TokenPayload {
  id: string
  username: string
}

// ─── Inscription ──────────────────────────────────────────────────────────────

export async function register(dto: RegisterDto) {
  const { username, email, password } = dto

  // Verifier si l'utilisateur existe deja
  const existing = await pool.query(
    'SELECT id FROM players WHERE email = $1 OR username = $2',
    [email, username]
  )
  if (existing.rows.length > 0) {
    throw new Error('Email ou nom d\'utilisateur deja utilise')
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS)

  const result = await pool.query(
    `INSERT INTO players (username, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, avatar, total_games, total_wins`,
    [username, email, hashed]
  )

  const player = result.rows[0]
  const token = generateToken(player)

  return { player, token }
}

// ─── Connexion ────────────────────────────────────────────────────────────────

export async function login(dto: LoginDto) {
  const { email, password } = dto

  const result = await pool.query(
    'SELECT * FROM players WHERE email = $1',
    [email]
  )

  if (result.rows.length === 0) {
    throw new Error('Email ou mot de passe incorrect')
  }

  const player = result.rows[0]
  const valid = await bcrypt.compare(password, player.password)

  if (!valid) {
    throw new Error('Email ou mot de passe incorrect')
  }

  const token = generateToken(player)

  const { password: _, ...playerSafe } = player
  return { player: playerSafe, token }
}

// ─── Profil joueur ────────────────────────────────────────────────────────────

export async function getProfile(playerId: string) {
  const result = await pool.query(
    `SELECT id, username, email, avatar, total_games, total_wins, total_score, created_at
     FROM players WHERE id = $1`,
    [playerId]
  )
  if (result.rows.length === 0) throw new Error('Joueur introuvable')
  return result.rows[0]
}

// ─── Generer un token JWT ─────────────────────────────────────────────────────

function generateToken(player: { id: string; username: string }): string {
  const secret = process.env.JWT_SECRET || 'rami_secret'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign(
    { id: player.id, username: player.username } as TokenPayload,
    secret,
    { expiresIn } as jwt.SignOptions
  )
}

// ─── Verifier un token JWT ────────────────────────────────────────────────────

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET || 'rami_secret'
  return jwt.verify(token, secret) as TokenPayload
}
