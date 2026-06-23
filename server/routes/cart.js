import { Router } from 'express'
import pool from '../db.js'
import { getUserId } from '../middleware/auth.js'

const router = Router()

// GET /api/cart — 查询当前用户购物车
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const [rows] = await pool.query(
      'SELECT id, user_id, product_id, product_name, main_image, price, quantity, sku_id, sku_name, created_at FROM cart_items WHERE user_id = ? ORDER BY id DESC',
      [userId]
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/cart — 加入购物车
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { product_id, product_name, main_image, price, quantity = 1, sku_id, sku_name } = req.body
    if (!product_id) return res.status(400).json({ code: 1, message: '缺少商品信息' })

    // 检查是否已存在（同 product + 同 sku）
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND (sku_id = ? OR (sku_id IS NULL AND ? IS NULL))',
      [userId, product_id, sku_id || null, sku_id || null]
    )
    if (existing.length > 0) {
      // 叠加数量
      const newQty = existing[0].quantity + Number(quantity)
      await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id])
      res.json({ code: 0, data: { id: existing[0].id, quantity: newQty }, message: '已更新数量' })
    } else {
      const [r] = await pool.query(
        'INSERT INTO cart_items (user_id, product_id, product_name, main_image, price, quantity, sku_id, sku_name) VALUES (?,?,?,?,?,?,?,?)',
        [userId, product_id, product_name || '', main_image || null, price || 0, quantity, sku_id || null, sku_name || null]
      )
      res.json({ code: 0, data: { id: r.insertId }, message: '已加入购物车' })
    }
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// PUT /api/cart/:id — 更新数量
router.put('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { quantity } = req.body
    if (!quantity || quantity < 1) return res.status(400).json({ code: 1, message: '数量至少为1' })
    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, userId])
    res.json({ code: 0, message: '已更新' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// DELETE /api/cart/:id — 删除单项
router.delete('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, userId])
    res.json({ code: 0, message: '已删除' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// DELETE /api/cart — 清空购物车
router.delete('/', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId])
    res.json({ code: 0, message: '已清空' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
