import { Router, Request, Response } from 'express'
import { register, login, getProfile } from './auth.service'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe minimum 6 caracteres' })
    }

    const result = await register({ username, email, password })
    return res.status(201).json(result)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const result = await login({ email, password })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(401).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const profile = await getProfile((req as any).player.id)
    return res.status(200).json(profile)
  } catch (err: any) {
    return res.status(404).json({ error: err.message })
  }
})

export default router
