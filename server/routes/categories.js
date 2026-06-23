import { Router } from 'express'
import pool from '../db.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/categories — 获取分类列表（前台 + 后台共用，无需认证）
// ?parent_id=0 → 一级分类; ?parent_id=N → 二级; 无参数 → 全部
router.get('/', async (req, res) => {
  try {
    const { parent_id } = req.query
    let sql = 'SELECT id, parent_id, name, sort_order, created_by FROM categories'
    const params = []
    if (parent_id !== undefined) {
      sql += ' WHERE parent_id = ?'
      params.push(Number(parent_id))
    }
    sql += ' ORDER BY sort_order ASC, id ASC'
    const [rows] = await pool.query(sql, params)
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/categories/tree — 树形结构（后台用，需管理员认证）
router.get('/tree', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, parent_id, name, sort_order, created_by FROM categories ORDER BY sort_order ASC, id ASC')
    const tree = rows
      .filter(r => r.parent_id === 0)
      .map(l1 => ({ ...l1, children: rows.filter(r => r.parent_id === l1.id) }))
    res.json({ code: 0, data: tree })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/categories
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { parent_id = 0, name, sort_order = 0 } = req.body
    if (!name) return res.status(400).json({ code: 1, message: '分类名不能为空' })
    const [r] = await pool.query(
      'INSERT INTO categories (parent_id, name, sort_order, created_by) VALUES (?,?,?,?)',
      [parent_id, name, sort_order, req.user.id]
    )
    res.json({ code: 0, data: { id: r.insertId }, message: '创建成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// PUT /api/categories/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, sort_order } = req.body

    // 归属检查
    const [[cat]] = await pool.query('SELECT created_by FROM categories WHERE id = ?', [req.params.id])
    if (!cat) return res.status(404).json({ code: 1, message: '分类不存在' })
    if (cat.created_by !== null && cat.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限修改该分类（仅创建者可编辑）' })
    }

    const sets = []; const params = []
    if (name !== undefined) { sets.push('name = ?'); params.push(name) }
    if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
    if (!sets.length) return res.status(400).json({ code: 1, message: '无更新字段' })
    params.push(req.params.id)
    await pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params)
    res.json({ code: 0, message: '更新成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// DELETE /api/categories/:id
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    // 归属检查
    const [[cat]] = await pool.query('SELECT created_by FROM categories WHERE id = ?', [req.params.id])
    if (!cat) return res.status(404).json({ code: 1, message: '分类不存在' })
    if (cat.created_by !== null && cat.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限删除该分类（仅创建者可删除）' })
    }

    await pool.query('DELETE FROM categories WHERE id = ? OR parent_id = ?', [req.params.id, req.params.id])
    res.json({ code: 0, message: '删除成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

export default router
