import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth/auth.service'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyToken(token)
    ;(req as any).player = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expire' })
  }
}
