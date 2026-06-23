import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../../public')

const router = Router()

function safeJson(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { return JSON.parse(v) } catch { return [] }
}

// GET /api/shop/products — 公开商品列表
router.get('/products', async (req, res) => {
  try {
    const { page = 1, pageSize = 24, category_l1, category_l2 } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)

    let where = 'WHERE p.status = 1'
    const params = []
    if (category_l1) { where += ' AND p.category_l1 = ?'; params.push(Number(category_l1)) }
    if (category_l2) { where += ' AND p.category_l2 = ?'; params.push(Number(category_l2)) }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products p ${where}`, params)
    const [rows] = await pool.query(
      `SELECT p.id, p.product_id, p.name, p.subtitle, p.category_l1, p.category_l2,
              c1.name AS category_l1_name, c2.name AS category_l2_name,
              MIN(s.price) AS min_price, MAX(s.price) AS max_price, p.main_image, p.images, p.sales_count
       FROM products p
       LEFT JOIN categories c1 ON p.category_l1 = c1.id
       LEFT JOIN categories c2 ON p.category_l2 = c2.id
       LEFT JOIN product_skus s ON s.product_id = p.product_id
       ${where} GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )
    const list = rows.map(r => ({ ...r, images: safeJson(r.images) }))
    // 为列表中的商品附带优惠券
    if (list.length) {
      const pids = [...new Set(list.map(p => p.product_id))]
      const [allCoupons] = await pool.query(
        `SELECT product_id, id, name, min_amount, discount FROM coupons WHERE product_id IN (${pids.map(() => '?').join(',')}) AND status = 1 ORDER BY discount DESC`,
        pids
      )
      const couponMap = {}
      for (const c of allCoupons) {
        if (!couponMap[c.product_id]) couponMap[c.product_id] = []
        couponMap[c.product_id].push(c)
      }
      for (const p of list) {
        p.coupons = couponMap[p.product_id] || []
      }
    }
    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    console.error('GET /api/shop/products error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/shop/products/search — 搜索商品
router.get('/products/search', async (req, res) => {
  try {
    const { q = '', page = 1, pageSize = 24 } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)
    const keyword = `%${q.trim()}%`

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status = 1 AND (p.name LIKE ? OR p.subtitle LIKE ?)`,
      [keyword, keyword]
    )
    const [rows] = await pool.query(
      `SELECT p.id, p.product_id, p.name, p.subtitle, p.category_l1, p.category_l2,
              c1.name AS category_l1_name, c2.name AS category_l2_name,
              MIN(s.price) AS min_price, MAX(s.price) AS max_price, p.main_image, p.images, p.sales_count
       FROM products p
       LEFT JOIN categories c1 ON p.category_l1 = c1.id
       LEFT JOIN categories c2 ON p.category_l2 = c2.id
       LEFT JOIN product_skus s ON s.product_id = p.product_id
       WHERE p.status = 1 AND (p.name LIKE ? OR p.subtitle LIKE ?)
       GROUP BY p.id ORDER BY p.sales_count DESC LIMIT ? OFFSET ?`,
      [keyword, keyword, Number(pageSize), offset]
    )
    const list = rows.map(r => ({ ...r, images: safeJson(r.images) }))

    // 附优惠券
    if (list.length) {
      const pids = [...new Set(list.map(p => p.product_id))]
      const [allCoupons] = await pool.query(
        `SELECT product_id, id, name, min_amount, discount FROM coupons WHERE product_id IN (${pids.map(() => '?').join(',')}) AND status = 1 ORDER BY discount DESC`,
        pids
      )
      const couponMap = {}
      for (const c of allCoupons) {
        if (!couponMap[c.product_id]) couponMap[c.product_id] = []
        couponMap[c.product_id].push(c)
      }
      for (const p of list) {
        p.coupons = couponMap[p.product_id] || []
      }
    }
    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    console.error('GET /api/shop/products/search error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/shop/products/:id — 商品详情
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [[product]] = await pool.query(
      `SELECT p.*, c1.name AS category_l1_name, c2.name AS category_l2_name
       FROM products p
       LEFT JOIN categories c1 ON p.category_l1 = c1.id
       LEFT JOIN categories c2 ON p.category_l2 = c2.id
       WHERE p.id = ? OR p.product_id = ?`,
      [id, id]
    )
    if (!product) return res.status(404).json({ code: 1, message: '商品不存在' })
    product.images = safeJson(product.images)
    // 从文件读取 Markdown 描述
    const descPath = path.join(PUBLIC_DIR, 'product', product.product_id, 'desc.md')
    if (fs.existsSync(descPath)) {
      product.description = fs.readFileSync(descPath, 'utf-8')
    }
    // 附带优惠券
    const [coupons] = await pool.query(
      'SELECT id, name, min_amount, discount FROM coupons WHERE product_id = ? AND status = 1 ORDER BY discount DESC',
      [product.product_id]
    )
    product.coupons = coupons
    // 附带 skus
    const [skus] = await pool.query(
      'SELECT id, product_id, spec_name, price, stock FROM product_skus WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [product.product_id]
    )
    product.skus = skus
    res.json({ code: 0, data: product })
  } catch (err) {
    console.error('GET /api/shop/products/:id error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
