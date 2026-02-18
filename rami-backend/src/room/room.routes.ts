import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { createRoom, getRoomByCode, getAvailableRooms } from './room.service'

const router = Router()

// POST /api/rooms - Creer une salle
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { variant = 'classique', teamMode = false, maxPlayers = 4 } = req.body
    const hostId = (req as any).player.id

    if (!['classique', 'avecJokers'].includes(variant)) {
      return res.status(400).json({ error: 'Variante invalide' })
    }

    if (![2, 3, 4].includes(maxPlayers)) {
      return res.status(400).json({ error: 'Nombre de joueurs invalide (2-4)' })
    }

    const room = await createRoom(hostId, { variant, teamMode, maxPlayers })
    return res.status(201).json(room)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/rooms - Lister les salles disponibles
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rooms = await getAvailableRooms()
    return res.status(200).json(rooms)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/rooms/:code - Trouver une salle par code
router.get('/:code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const room = await getRoomByCode(req.params.code as string)
    return res.status(200).json(room)
  } catch (err: any) {
    return res.status(404).json({ error: err.message })
  }
})

export default router
