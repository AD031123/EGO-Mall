import { Router } from 'express'
import pool from '../db.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/brands — 品牌列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM brand WHERE is_display = 1 ORDER BY sort_order, id'
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    console.error('GET /api/brands error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/brands — 新增品牌
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ code: 1, message: '品牌名称不能为空' })
    }

    const [result] = await pool.query(
      'INSERT INTO brand (name, created_by) VALUES (?,?)',
      [name, req.user.id]
    )

    res.json({
      code: 0,
      data: { id: result.insertId, name },
      message: '品牌新增成功'
    })
  } catch (err) {
    console.error('POST /api/brands error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
