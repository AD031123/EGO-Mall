import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/tags — 获取所有可用标签
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tag WHERE is_display = 1 ORDER BY sort_order, id'
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    console.error('GET /api/tags error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
