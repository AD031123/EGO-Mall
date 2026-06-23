import { Router } from 'express'
import crypto from 'crypto'
import pool from '../db.js'
import { verifyToken, requireAdmin, getUserId } from '../middleware/auth.js'

const router = Router()

function genId() {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  const ts = Date.now().toString(36)
  return (ts + uuid).substring(0, 20)
}

// GET /api/orders — 订单列表
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, user_id, keyword = '', status, return_status } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)
    let where = '1=1'; const params = []
    if (user_id) { where += ' AND user_id = ?'; params.push(Number(user_id)) }
    if (keyword) { where += ' AND (order_id LIKE ? OR username LIKE ? OR product_name LIKE ?)'; params.push('%'+keyword+'%', '%'+keyword+'%', '%'+keyword+'%') }
    if (status !== '' && status !== undefined) { where += ' AND status = ?'; params.push(Number(status)) }
    if (return_status !== '' && return_status !== undefined) { where += ' AND return_status = ?'; params.push(Number(return_status)) }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`, params)
    const [rows] = await pool.query(
      `SELECT * FROM orders WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )
    res.json({ code: 0, data: { list: rows, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/orders/returns/pending — 获取待处理退货
router.get('/returns/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM orders WHERE return_status = 1 ORDER BY return_processed_at DESC, id DESC`
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/orders/:id — 订单详情
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_id = ?', [req.params.id, req.params.id])
    if (!row) return res.status(404).json({ code: 1, message: '订单不存在' })
    res.json({ code: 0, data: row })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/orders/group/:order_id
router.get('/group/:order_id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.order_id])
    if (!rows.length) return res.status(404).json({ code: 1, message: '订单不存在' })
    const summary = {
      order_id: rows[0].order_id,
      user_id: rows[0].user_id,
      username: rows[0].username,
      address_snapshot: rows[0].address_snapshot ? (typeof rows[0].address_snapshot === 'string' ? JSON.parse(rows[0].address_snapshot) : rows[0].address_snapshot) : null,
      status: rows[0].status,
      created_at: rows[0].created_at,
      total: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      items: rows.map(r => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        unit_price: r.unit_price,
        quantity: r.quantity,
        total_amount: r.total_amount
      }))
    }
    res.json({ code: 0, data: summary })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/orders — 批量下单（前台用户）
router.post('/', async (req, res) => {
  try {
    const { user_id, username, items, address_id, address_snapshot } = req.body
    if (!user_id) return res.status(400).json({ code: 1, message: '请先登录' })
    if (!items || !Array.isArray(items) || !items.length) return res.status(400).json({ code: 1, message: '购物车为空' })

    let addrSnapshot = address_snapshot || null
    if (address_id && !addrSnapshot) {
      const [[addr]] = await pool.query('SELECT * FROM addresses WHERE id = ?', [address_id])
      if (addr) addrSnapshot = JSON.stringify({ province: addr.province, city: addr.city, district: addr.district, detail: addr.detail, phone: addr.phone, receiver_name: addr.receiver_name })
    }

    const orderId = 'ORD' + genId()
    let grandTotal = 0
    for (const item of items) {
      const qty = Number(item.quantity) || 1
      const price = Number(item.price) || 0
      const total = price * qty
      grandTotal += total
      await pool.query(
        'INSERT INTO orders (order_id, user_id, username, product_id, product_name, sku_name, unit_price, quantity, total_amount, address_snapshot, status) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
        [orderId, user_id, username || '', item.product_id, item.product_name || '', item.sku_name || null, price, qty, total, addrSnapshot]
      )
    }
    res.json({ code: 0, data: { order_id: orderId, total_amount: grandTotal }, message: '下单成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// PUT /api/orders/:id — 更新订单（管理员）
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    // 归属检查
    const [[order]] = await pool.query('SELECT created_by FROM orders WHERE id = ?', [req.params.id])
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' })
    if (order.created_by !== null && order.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限修改该订单（仅创建者可编辑）' })
    }

    const { username, product_name, unit_price, quantity, total_amount, status } = req.body
    const sets = []; const params = []
    if (username !== undefined) { sets.push('username = ?'); params.push(username) }
    if (product_name !== undefined) { sets.push('product_name = ?'); params.push(product_name) }
    if (unit_price !== undefined) { sets.push('unit_price = ?'); params.push(Number(unit_price)) }
    if (quantity !== undefined) { sets.push('quantity = ?'); params.push(Number(quantity)) }
    if (total_amount !== undefined) { sets.push('total_amount = ?'); params.push(Number(total_amount)) }
    if (status !== undefined) { sets.push('status = ?'); params.push(Number(status)) }
    if (!sets.length) return res.status(400).json({ code: 1, message: '无更新字段' })
    params.push(req.params.id)
    await pool.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params)
    res.json({ code: 0, message: '更新成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/orders/:id/return — 用户退货申请
router.post('/:id/return', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { reason = '' } = req.body
    const [[order]] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    )
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' })
    if (order.return_status === 1) return res.status(400).json({ code: 1, message: '已申请退货，等待处理中' })
    if (order.return_status === 2) return res.status(400).json({ code: 1, message: '退货已通过' })
    if (order.return_status === 3) return res.status(400).json({ code: 1, message: '退货已拒绝' })
    // 状态：return_status = 1 表示待处理
    await pool.query(
      'UPDATE orders SET return_reason = ?, return_status = 1, return_processed_at = NOW() WHERE id = ?',
      [reason || null, req.params.id]
    )
    res.json({ code: 0, message: '退货申请已提交，等待审核' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/orders/:id/return/approve — 管理员同意退货
router.post('/:id/return/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT created_by FROM orders WHERE id = ?', [req.params.id])
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' })
    // 退货处理：如果订单有创建者（管理员创建），检查归属；前台用户下单的订单 created_by 为 NULL，所有管理员可处理
    if (order.created_by !== null && order.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限处理该订单退货（仅创建者可操作）' })
    }
    await pool.query(
      'UPDATE orders SET return_status = 2, return_processed_at = NOW() WHERE id = ?',
      [req.params.id]
    )
    res.json({ code: 0, message: '已同意退货' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/orders/:id/return/reject — 管理员拒绝退货
router.post('/:id/return/reject', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT created_by FROM orders WHERE id = ?', [req.params.id])
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' })
    if (order.created_by !== null && order.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限处理该订单退货（仅创建者可操作）' })
    }
    const { reject_reason = '' } = req.body
    await pool.query(
      'UPDATE orders SET return_status = 3, return_reject_reason = ?, return_processed_at = NOW() WHERE id = ?',
      [reject_reason || null, req.params.id]
    )
    res.json({ code: 0, message: '已拒绝退货' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/orders/returns/messages — 获取用户退货消息
router.get('/returns/messages', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.json({ code: 0, data: [] })
    const [rows] = await pool.query(
      `SELECT id, order_id, product_name, return_reason, return_status, return_reject_reason, return_processed_at
       FROM orders WHERE user_id = ? AND return_status > 0
       ORDER BY return_processed_at DESC`,
      [userId]
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// DELETE /api/orders/:id — 删除订单（管理员）
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT created_by FROM orders WHERE id = ?', [req.params.id])
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' })
    if (order.created_by !== null && order.created_by !== req.user.id) {
      return res.status(403).json({ code: 1, message: '无权限删除该订单（仅创建者可删除）' })
    }
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id])
    res.json({ code: 0, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
