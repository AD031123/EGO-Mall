import { Router } from 'express'
import pool from '../db.js'
import { verifyToken, requireAdmin, getUserId } from '../middleware/auth.js'

const router = Router()

// GET /api/coupons?product_id=X  — 获取商品优惠券
router.get('/', async (req, res) => {
  try {
    const { product_id } = req.query
    let sql = 'SELECT * FROM coupons WHERE status = 1'
    const params = []
    if (product_id) { sql += ' AND product_id = ?'; params.push(product_id) }
    sql += ' ORDER BY discount DESC'
    const [rows] = await pool.query(sql, params)
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/coupons/claim  — 领取优惠券 { coupon_id }
router.post('/claim', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { coupon_id } = req.body
    if (!coupon_id) return res.status(400).json({ code: 1, message: '缺少优惠券ID' })

    // 检查是否已领取
    const [existing] = await pool.query(
      'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
      [userId, coupon_id]
    )
    if (existing.length > 0) return res.status(400).json({ code: 1, message: '已领取过该优惠券' })

    await pool.query('INSERT INTO user_coupons (user_id, coupon_id) VALUES (?,?)', [userId, coupon_id])
    res.json({ code: 0, message: '领取成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/coupons/my  — 我的优惠券（未使用）
router.get('/my', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })

    const [rows] = await pool.query(
      `SELECT uc.id, uc.coupon_id, uc.used, uc.created_at, c.name, c.min_amount, c.discount, c.product_id
       FROM user_coupons uc
       JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.user_id = ? AND uc.used = 0
       ORDER BY uc.id DESC`,
      [userId]
    )
    res.json({ code: 0, data: rows })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/coupons/use  — 使用优惠券（标记已用）
router.post('/use', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '请先登录' })
    const { coupon_id } = req.body
    await pool.query('UPDATE user_coupons SET used = 1 WHERE user_id = ? AND coupon_id = ?', [userId, coupon_id])
    res.json({ code: 0, message: '已使用' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/coupons/check?product_id=X  — 检查用户是否已领该商品券
router.get('/check', async (req, res) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return res.json({ code: 0, data: [] })
    const { product_id } = req.query
    const [rows] = await pool.query(
      `SELECT c.id FROM coupons c
       JOIN user_coupons uc ON uc.coupon_id = c.id
       WHERE uc.user_id = ? AND c.product_id = ? AND uc.used = 0`,
      [userId, product_id]
    )
    res.json({ code: 0, data: rows.map(r => r.id) })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/coupons/deals — 优惠专区：所有有效优惠券 + 商品信息
router.get('/deals', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.name, c.min_amount, c.discount, c.valid_days,
        p.product_id, p.name AS product_name, p.subtitle, p.main_image, p.sales_count,
        p.category_l1, p.category_l2,
        c1.name AS category_l1_name, c2.name AS category_l2_name,
        MIN(s.price) AS min_price, MAX(s.price) AS max_price
      FROM coupons c
      JOIN products p ON c.product_id COLLATE utf8mb4_unicode_ci = p.product_id
      LEFT JOIN categories c1 ON p.category_l1 = c1.id
      LEFT JOIN categories c2 ON p.category_l2 = c2.id
      LEFT JOIN product_skus s ON s.product_id COLLATE utf8mb4_unicode_ci = p.product_id
      WHERE c.status = 1 AND p.status = 1
      GROUP BY c.id, p.id ORDER BY c.discount DESC, p.sales_count DESC
    `)
    res.json({ code: 0, data: rows })
  } catch (err) {
    console.error('GET /api/coupons/deals error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/coupons  — 管理员创建优惠券
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { product_id, name, min_amount, discount, valid_days = 30 } = req.body
    if (!product_id || !name || !min_amount || !discount) return res.status(400).json({ code: 1, message: '缺少必要字段' })
    const [r] = await pool.query(
      'INSERT INTO coupons (product_id, name, min_amount, discount, valid_days, created_by) VALUES (?,?,?,?,?,?)',
      [product_id, name, min_amount, discount, valid_days, req.user.id]
    )
    res.json({ code: 0, data: { id: r.insertId }, message: '创建成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// DELETE /api/coupons/:id  — 管理员删除优惠券
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[coupon]] = await pool.query('SELECT id FROM coupons WHERE id = ?', [req.params.id])
    if (!coupon) return res.status(404).json({ code: 1, message: '优惠券不存在' })
    await pool.query('DELETE FROM coupons WHERE id = ?', [req.params.id])
    res.json({ code: 0, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
