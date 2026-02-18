import { pool } from '../db/pool'
import { v4 as uuidv4 } from 'uuid'

// ─── Generer un code de salle unique (6 chars) ────────────────────────────────

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ─── Creer une salle ──────────────────────────────────────────────────────────

export async function createRoom(hostId: string, options: {
  variant: 'classique' | 'avecJokers'
  teamMode: boolean
  maxPlayers: number
}) {
  const code = generateRoomCode()

  const result = await pool.query(
    `INSERT INTO rooms (code, host_id, variant, team_mode, max_players)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [code, hostId, options.variant, options.teamMode, options.maxPlayers]
  )

  return result.rows[0]
}

// ─── Rejoindre une salle par code ─────────────────────────────────────────────

export async function getRoomByCode(code: string) {
  const result = await pool.query(
    'SELECT * FROM rooms WHERE code = $1 AND status = $2',
    [code.toUpperCase(), 'waiting']
  )

  if (result.rows.length === 0) {
    throw new Error('Salle introuvable ou partie deja commencee')
  }

  return result.rows[0]
}

// ─── Lister les salles disponibles ────────────────────────────────────────────

export async function getAvailableRooms() {
  const result = await pool.query(
    `SELECT r.*, p.username as host_name
     FROM rooms r
     JOIN players p ON r.host_id = p.id
     WHERE r.status = 'waiting'
     ORDER BY r.created_at DESC
     LIMIT 20`
  )
  return result.rows
}

// ─── Fermer une salle ─────────────────────────────────────────────────────────

export async function closeRoom(roomId: string) {
  await pool.query(
    'UPDATE rooms SET status = $1 WHERE id = $2',
    ['playing', roomId]
  )
}

// ─── Sauvegarder une partie terminee ─────────────────────────────────────────

export async function saveGameResult(data: {
  variant: string
  mode: string
  teamMode: boolean
  maxPlayers: number
  winnerId: string | null
  players: { id: string; score: number; teamId: string | null; isWinner: boolean }[]
}) {
  const gameResult = await pool.query(
    `INSERT INTO games (variant, mode, team_mode, max_players, status, winner_id, finished_at)
     VALUES ($1, $2, $3, $4, 'finished', $5, NOW())
     RETURNING id`,
    [data.variant, data.mode, data.teamMode, data.maxPlayers, data.winnerId]
  )

  const gameId = gameResult.rows[0].id

  for (const player of data.players) {
    await pool.query(
      `INSERT INTO game_players (game_id, player_id, team_id, score, is_winner)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, player.id, player.teamId, player.score, player.isWinner]
    )

    // Mettre a jour les stats du joueur
    await pool.query(
      `UPDATE players
       SET total_games = total_games + 1,
           total_wins  = total_wins + $1,
           total_score = total_score + $2
       WHERE id = $3`,
      [player.isWinner ? 1 : 0, player.score, player.id]
    )
  }

  return gameId
}
