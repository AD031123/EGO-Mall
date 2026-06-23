import { Router } from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../../public')

const router = Router()

function genId() { return crypto.randomUUID().replace(/-/g, '').substring(0, 16) }

function saveImageToDir(base64Data, dir, nameHint) {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return null
  const ext = matches[1] === 'png' ? 'png' : 'jpg'
  const buffer = Buffer.from(matches[2], 'base64')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filename = nameHint + '.' + ext
  fs.writeFileSync(path.join(dir, filename), buffer)
  const relative = path.relative(PUBLIC_DIR, path.join(dir, filename)).replace(/\\/g, '/')
  return '/' + relative
}

function safeJson(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { return JSON.parse(v) } catch { return [] }
}

const LIST_SELECT = `
  SELECT p.id, p.product_id, p.name, p.subtitle, p.category_l1, p.category_l2,
         c1.name AS category_l1_name, c2.name AS category_l2_name,
         MIN(s.price) AS min_price, MAX(s.price) AS max_price,
         (SELECT COUNT(*) FROM product_skus WHERE product_id = p.product_id) AS sku_count,
         p.main_image, p.images, p.description, p.status, p.created_phone, p.created_by, p.created_at
  FROM products p
  LEFT JOIN categories c1 ON p.category_l1 = c1.id
  LEFT JOIN categories c2 ON p.category_l2 = c2.id
  LEFT JOIN product_skus s ON s.product_id = p.product_id
`

// 管理端读取（需要登录）
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '', category_l1, category_l2, status } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)
    let where = '1=1'; const params = []
    if (keyword) { where += ' AND p.name LIKE ?'; params.push(`%${keyword}%`) }
    if (category_l1) { where += ' AND p.category_l1 = ?'; params.push(Number(category_l1)) }
    if (category_l2) { where += ' AND p.category_l2 = ?'; params.push(Number(category_l2)) }
    if (status !== '' && status !== undefined) { where += ' AND p.status = ?'; params.push(Number(status)) }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params)
    const [rows] = await pool.query(
      `${LIST_SELECT} WHERE ${where} GROUP BY p.id, p.product_id, p.name, p.subtitle, p.category_l1, p.category_l2, c1.name, c2.name, p.main_image, p.images, p.description, p.status, p.created_phone, p.created_by, p.created_at ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )
    const list = rows.map(r => ({ ...r, images: safeJson(r.images) }))
    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    console.error('GET /api/products error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT p.*, c1.name AS category_l1_name, c2.name AS category_l2_name
       FROM products p
       LEFT JOIN categories c1 ON p.category_l1 = c1.id
       LEFT JOIN categories c2 ON p.category_l2 = c2.id
       WHERE p.id = ? OR p.product_id = ?`,
      [req.params.id, req.params.id]
    )
    if (!row) return res.status(404).json({ code: 1, message: '商品不存在' })
    row.images = safeJson(row.images)
    const descPath = path.join(PUBLIC_DIR, 'product', row.product_id, 'desc.md')
    if (fs.existsSync(descPath)) {
      row.description = fs.readFileSync(descPath, 'utf-8')
    }
    const [skus] = await pool.query(
      'SELECT id, product_id, spec_name, price, stock, sort_order FROM product_skus WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [row.product_id]
    )
    row.skus = skus
    res.json({ code: 0, data: row })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// ========== 创建 ==========
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, subtitle, category_l1, category_l2, main_image, images, video_url, description, status = 1, skus } = req.body
    if (!name) return res.status(400).json({ code: 1, message: '商品名称不能为空' })
    if (!skus || !Array.isArray(skus) || !skus.length) return res.status(400).json({ code: 1, message: '请至少添加一个规格' })
    const productId = 'P' + genId()
    const productDir = path.join(PUBLIC_DIR, 'product', productId)

    let finalMainImage = main_image || null
    if (finalMainImage && finalMainImage.startsWith('data:image/')) {
      finalMainImage = saveImageToDir(finalMainImage, productDir, 'main')
    }

    let finalImages = null
    if (Array.isArray(images) && images.length) {
      finalImages = images.slice(0, 10).map((img, i) => {
        if (img && img.startsWith('data:image/')) return saveImageToDir(img, productDir, 'sub_' + (i + 1))
        return img
      }).filter(Boolean)
    }
    const imagesJson = finalImages ? JSON.stringify(finalImages) : null

    if (description) {
      const descDir = path.join(PUBLIC_DIR, 'product', productId)
      if (!fs.existsSync(descDir)) fs.mkdirSync(descDir, { recursive: true })
      fs.writeFileSync(path.join(descDir, 'desc.md'), description, 'utf-8')
    }

    // 使用 req.user.id 作为创建者，替换原来的 created_phone
    const [r] = await pool.query(
      'INSERT INTO products (product_id, name, subtitle, category_l1, category_l2, main_image, images, video_url, description, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [productId, name, subtitle || null, category_l1 || null, category_l2 || null, finalMainImage, imagesJson, video_url || null, description ? description.substring(0, 200) : null, status, req.user.id]
    )

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i]
      await pool.query(
        'INSERT INTO product_skus (product_id, spec_name, price, stock, sort_order) VALUES (?,?,?,?,?)',
        [productId, sku.spec_name || '默认', Number(sku.price) || 0, Number(sku.stock) || 0, i + 1]
      )
    }

    res.json({ code: 0, data: { id: r.insertId, product_id: productId }, message: '创建成功' })
  } catch (err) {
    console.error('POST /api/products error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// ========== 更新 ==========
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, subtitle, category_l1, category_l2, main_image, images, video_url, description, status, skus } = req.body
    const id = req.params.id

    // 获取 product_id
    const [[prod]] = await pool.query('SELECT product_id FROM products WHERE id = ? OR product_id = ?', [id, id])
    if (!prod) return res.status(404).json({ code: 1, message: '商品不存在' })

    const productId = prod.product_id
    const productDir = path.join(PUBLIC_DIR, 'product', productId)

    const sets = []; const params = []

    let finalMainImage = main_image
    if (finalMainImage !== undefined && finalMainImage && finalMainImage.startsWith('data:image/')) {
      finalMainImage = saveImageToDir(finalMainImage, productDir, 'main')
    }

    let finalImages = images
    if (finalImages !== undefined && Array.isArray(finalImages)) {
      finalImages = finalImages.slice(0, 10).map((img, i) => {
        if (img && img.startsWith('data:image/')) return saveImageToDir(img, productDir, 'sub_' + (i + 1))
        return img
      }).filter(Boolean)
    }

    if (name !== undefined) { sets.push('name = ?'); params.push(name) }
    if (subtitle !== undefined) { sets.push('subtitle = ?'); params.push(subtitle || null) }
    if (category_l1 !== undefined) { sets.push('category_l1 = ?'); params.push(category_l1 || null) }
    if (category_l2 !== undefined) { sets.push('category_l2 = ?'); params.push(category_l2 || null) }
    if (main_image !== undefined) { sets.push('main_image = ?'); params.push(finalMainImage || null) }
    if (images !== undefined) { sets.push('images = ?'); params.push(finalImages ? JSON.stringify(finalImages) : null) }
    if (description !== undefined) {
      const descDir = path.join(PUBLIC_DIR, 'product', productId)
      if (!fs.existsSync(descDir)) fs.mkdirSync(descDir, { recursive: true })
      fs.writeFileSync(path.join(descDir, 'desc.md'), description || '', 'utf-8')
      sets.push('description = ?'); params.push((description || '').substring(0, 200))
    }
    if (video_url !== undefined) { sets.push('video_url = ?'); params.push(video_url || null) }
    if (status !== undefined) { sets.push('status = ?'); params.push(Number(status)) }

    if (sets.length) {
      params.push(id)
      await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ? OR product_id = ?`, [...params, id])
    }

    if (skus !== undefined && Array.isArray(skus)) {
      await pool.query('DELETE FROM product_skus WHERE product_id = ?', [productId])
      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i]
        await pool.query(
          'INSERT INTO product_skus (product_id, spec_name, price, stock, sort_order) VALUES (?,?,?,?,?)',
          [productId, sku.spec_name || '默认', Number(sku.price) || 0, Number(sku.stock) || 0, i + 1]
        )
      }
    }

    res.json({ code: 0, message: '更新成功' })
  } catch (err) {
    console.error('PUT /api/products/:id error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

const MAX_PRODUCT_DIR_SIZE = 10 * 1024 * 1024

router.post('/upload-desc-image', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { product_id, image } = req.body
    if (!product_id || !image) return res.status(400).json({ code: 1, message: '缺少参数' })
    if (!image.startsWith('data:image/')) return res.status(400).json({ code: 1, message: '图片格式不正确' })

    // 获取商品信息
    const [[prod]] = await pool.query('SELECT product_id FROM products WHERE id = ? OR product_id = ?', [product_id, product_id])
    if (!prod) return res.status(404).json({ code: 1, message: '商品不存在' })

    const pid = prod.product_id
    const prodDir = path.join(PUBLIC_DIR, 'product', pid)
    let currentSize = 0
    if (fs.existsSync(prodDir)) {
      const files = fs.readdirSync(prodDir)
      for (const f of files) {
        try { currentSize += fs.statSync(path.join(prodDir, f)).size } catch {}
      }
    }

    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) return res.status(400).json({ code: 1, message: '图片格式不正确' })
    const buffer = Buffer.from(matches[2], 'base64')

    if (currentSize + buffer.length > MAX_PRODUCT_DIR_SIZE) {
      const usedMB = (currentSize / 1048576).toFixed(1)
      const limitMB = (MAX_PRODUCT_DIR_SIZE / 1048576).toFixed(0)
      return res.status(400).json({ code: 1, message: `存储空间不足！已用 ${usedMB}MB，限制 ${limitMB}MB` })
    }

    const ext = matches[1] === 'png' ? 'png' : 'jpg'
    const filename = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6) + '.' + ext
    if (!fs.existsSync(prodDir)) fs.mkdirSync(prodDir, { recursive: true })
    fs.writeFileSync(path.join(prodDir, filename), buffer)
    const imagePath = '/product/' + pid + '/' + filename

    res.json({ code: 0, data: { path: imagePath }, message: '上传成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[prod]] = await pool.query('SELECT product_id FROM products WHERE id = ? OR product_id = ?', [req.params.id, req.params.id])
    if (!prod) return res.status(404).json({ code: 1, message: '商品不存在' })
    await pool.query('DELETE FROM product_skus WHERE product_id = ?', [prod.product_id])
    await pool.query('DELETE FROM products WHERE id = ? OR product_id = ?', [req.params.id, req.params.id])
    res.json({ code: 0, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
