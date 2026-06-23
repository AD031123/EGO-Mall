import { Router } from 'express'
import pool from '../db.js'
import { getUserId } from '../middleware/auth.js'

const router = Router()

// GET /api/address — 获取用户地址列表
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const [rows] = await pool.query(
      'SELECT id, province, city, district, detail, phone, receiver_name, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [userId]
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/address — 新增地址
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { province, city, district, detail, phone, receiver_name, is_default = 0 } = req.body
    if (!province || !city || !district || !detail || !phone) {
      return res.status(400).json({ code: 1, message: '请填完地址信息' })
    }
    // 如果设为默认，先取消其他默认
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId])
    }
    const [r] = await pool.query(
      'INSERT INTO addresses (user_id, province, city, district, detail, phone, receiver_name, is_default) VALUES (?,?,?,?,?,?,?,?)',
      [userId, province, city, district, detail, phone, receiver_name || null, is_default]
    )
    res.json({ code: 0, data: { id: r.insertId }, message: '地址已保存' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// PUT /api/address/:id — 更新地址
router.put('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { province, city, district, detail, phone, receiver_name, is_default } = req.body
    const sets = []; const params = []
    if (province !== undefined) { sets.push('province = ?'); params.push(province) }
    if (city !== undefined) { sets.push('city = ?'); params.push(city) }
    if (district !== undefined) { sets.push('district = ?'); params.push(district) }
    if (detail !== undefined) { sets.push('detail = ?'); params.push(detail) }
    if (phone !== undefined) { sets.push('phone = ?'); params.push(phone) }
    if (receiver_name !== undefined) { sets.push('receiver_name = ?'); params.push(receiver_name) }
    if (is_default !== undefined) {
      if (is_default) await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId])
      sets.push('is_default = ?'); params.push(is_default)
    }
    if (!sets.length) return res.status(400).json({ code: 1, message: '无更新字段' })
    params.push(req.params.id)
    await pool.query(`UPDATE addresses SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...params, userId])
    res.json({ code: 0, message: '已更新' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// DELETE /api/address/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, userId])
    res.json({ code: 0, message: '已删除' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
