import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db.js'
import { JWT_SECRET, JWT_EXPIRES, verifyToken, requireAdmin, getUserId } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../../public')

const router = Router()

function genUid(date, id) {
  const d = new Date(date)
  const y = d.getFullYear().toString()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 90) + 10) // 10-99
  return `U${y}${m}${day}${String(id).padStart(4, '0')}${rand}`
}

// ---------- 注册 ----------
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password, avatar_image, birthday, gender } = req.body
    if (!username || !password) return res.status(400).json({ code: 1, message: '用户名和密码不能为空' })
    if (password.length < 6) return res.status(400).json({ code: 1, message: '密码至少6位' })

    // 用户名唯一，手机号唯一，邮箱不唯一（允许重复）
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR (phone IS NOT NULL AND phone = ?)',
      [username, phone || null]
    )
    if (existing.length > 0) return res.status(400).json({ code: 1, message: '用户名或手机号已存在' })

    const passwordHash = await bcrypt.hash(password, 10)
    // 先插入一个临时 uid，后续用 id 生成真正的 uid
    const tempUid = 'TEMP' + Date.now() + Math.random().toString(36).substring(2, 6)
    const [r] = await pool.query(
      'INSERT INTO users (uid, username, email, phone, birthday, gender, password_hash) VALUES (?,?,?,?,?,?,?)',
      [tempUid, username, email || null, phone || null, birthday || null, gender || null, passwordHash]
    )
    const uid = genUid(new Date(), r.insertId)

    // 处理头像：保存到 public/user/{uid}/show.jpg
    let avatarPath = null
    if (avatar_image && avatar_image.startsWith('data:image/')) {
      const matches = avatar_image.match(/^data:image\/(\w+);base64,(.+)$/)
      if (matches) {
        const ext = matches[1] === 'png' ? 'png' : 'jpg'
        const buffer = Buffer.from(matches[2], 'base64')
        if (buffer.length <= 200 * 1024) {
          const userDir = path.join(PUBLIC_DIR, 'user', uid)
          if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })
          fs.writeFileSync(path.join(userDir, `show.${ext}`), buffer)
          avatarPath = `/user/${uid}/show.${ext}`
        }
      }
    }

    // 更新 uid 和 avatar
    if (avatarPath) {
      await pool.query('UPDATE users SET uid = ?, avatar = ? WHERE id = ?', [uid, avatarPath, r.insertId])
    } else {
      await pool.query('UPDATE users SET uid = ? WHERE id = ?', [uid, r.insertId])
    }

    // 生成 cookie token
    const cookieToken = crypto.randomUUID().replace(/-/g, '')
    await pool.query('UPDATE users SET cookie_token = ? WHERE id = ?', [cookieToken, r.insertId])
    const user = { id: r.insertId, uid, username, email: email || null, phone: phone || null, avatar: avatarPath, role: 'user', birthday: birthday || null, gender: gender || null }
    const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.json({ code: 0, data: { token, user, cookie_token: cookieToken }, message: '注册成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// ---------- 登录 ----------
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body
    if (!account || !password) return res.status(400).json({ code: 1, message: '手机号/邮箱和密码不能为空' })

    // 先判断 account 是手机号还是邮箱格式
    const isPhone = /^1\d{10}$/.test(account)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)

    const [users] = await pool.query('SELECT * FROM users WHERE email = ? OR phone = ?', [account, account])
    if (!users.length) {
      // 判定输入格式并给出更友好的提示
      if (isPhone) {
        return res.status(400).json({ code: 3, message: '该手机号尚未注册，请先注册账号' })
      }
      if (isEmail) {
        return res.status(400).json({ code: 3, message: '该邮箱尚未注册，请先注册账号' })
      }
      return res.status(400).json({ code: 1, message: '账号不存在，请先注册' })
    }
    const user = users[0]
    // 检查账号是否被封禁
    if (user.status === 0) return res.status(403).json({ code: 2, message: '该账号已被封禁，请联系管理员' })
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(400).json({ code: 1, message: '密码错误' })
    const userInfo = { id: user.id, uid: user.uid, username: user.username, email: user.email, phone: user.phone, avatar: user.avatar, status: user.status, role: user.role || 'user', birthday: user.birthday, gender: user.gender }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    // 生成 cookie token 存入数据库（长期有效，用于自动登录）
    const cookieToken = crypto.randomUUID().replace(/-/g, '')
    await pool.query('UPDATE users SET cookie_token = ? WHERE id = ?', [cookieToken, user.id])
    res.json({ code: 0, data: { token, user: userInfo, cookie_token: cookieToken }, message: '登录成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// POST /api/user/logout — 退出登录，清除 cookie_token
router.post('/logout', async (req, res) => {
  try {
    const { uid } = req.body
    if (uid) await pool.query('UPDATE users SET cookie_token = NULL WHERE uid = ?', [uid])
    res.json({ code: 0, message: '已退出' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// POST /api/user/auto-login — cookie token 自动登录
router.post('/auto-login', async (req, res) => {
  try {
    const { cookie_token } = req.body
    if (!cookie_token) return res.status(400).json({ code: 1, message: '缺少凭证' })
    const [users] = await pool.query('SELECT * FROM users WHERE cookie_token = ?', [cookie_token])
    if (!users.length) return res.status(400).json({ code: 1, message: '凭证无效' })
    const user = users[0]
    // 检查账号是否被封禁
    if (user.status === 0) return res.status(403).json({ code: 2, message: '该账号已被封禁，请联系管理员' })
    const userInfo = { id: user.id, uid: user.uid, username: user.username, email: user.email, phone: user.phone, avatar: user.avatar, status: user.status, role: user.role || 'user', birthday: user.birthday, gender: user.gender }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.json({ code: 0, data: { token, user: userInfo, cookie_token }, message: '自动登录成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// 测试接口：用户自行切换管理员权限（仅开发/测试用途）
router.put('/:id/toggle-admin', verifyToken, async (req, res) => {
  try {
    // 只允许用户操作自己的账号
    const userId = String(req.params.id)
    if (String(req.user.id) !== userId) {
      return res.status(403).json({ code: 1, message: '只能操作自己的账号' })
    }
    const [[u]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId])
    if (!u) return res.status(404).json({ code: 1, message: '用户不存在' })
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId])
    res.json({
      code: 0,
      data: { id: userId, role: newRole },
      message: newRole === 'admin' ? '已切换为管理员（请重新登录生效）' : '已取消管理员权限（请重新登录生效）'
    })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// PUT /api/user/:id/avatar — 更新头像（base64 方式）
router.put('/:id/avatar', async (req, res) => {
  try {
    const { avatar } = req.body
    await pool.query('UPDATE users SET avatar = ? WHERE id = ? OR uid = ?', [avatar || null, req.params.id, req.params.id])
    res.json({ code: 0, message: '头像已更新' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// POST /api/user/upload-avatar — 上传裁剪后的头像文件（保存到 public/user/{uid}/show.jpg）
router.post('/upload-avatar', async (req, res) => {
  try {
    const { uid, image } = req.body  // image: base64 data URL (image/jpeg)
    if (!uid || !image) return res.status(400).json({ code: 1, message: '缺少参数' })

    // 解析 base64
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) return res.status(400).json({ code: 1, message: '图片格式不正确' })
    const ext = matches[1] === 'png' ? 'png' : 'jpg'
    const buffer = Buffer.from(matches[2], 'base64')

    // 限制 200KB
    if (buffer.length > 200 * 1024) {
      return res.status(400).json({ code: 1, message: `图片过大 (${(buffer.length/1024).toFixed(0)}KB)，需 ≤200KB` })
    }

    // 确保目录存在
    const userDir = path.join(PUBLIC_DIR, 'user', uid)
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })

    // 写入文件
    const filePath = path.join(userDir, `show.${ext}`)
    fs.writeFileSync(filePath, buffer)

    // 更新数据库 avatar 字段为相对路径
    const avatarPath = `/user/${uid}/show.${ext}`
    await pool.query('UPDATE users SET avatar = ? WHERE uid = ?', [avatarPath, uid])

    // 获取最新用户信息
    const [[user]] = await pool.query('SELECT id, uid, username, email, phone, avatar FROM users WHERE uid = ?', [uid])
    res.json({ code: 0, data: { avatar: avatarPath, user }, message: '头像已更新' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// ========== 管理端用户 CRUD ==========

router.get('/list', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)
    let where = '1=1'; const params = []
    if (keyword) { where += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push('%'+keyword+'%', '%'+keyword+'%', '%'+keyword+'%') }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, params)
    const [rows] = await pool.query(`SELECT id, uid, username, email, phone, avatar, status, created_by, created_at FROM users WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset])
    res.json({ code: 0, data: { list: rows, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  const [[user]] = await pool.query('SELECT id, uid, username, email, phone, avatar, status, created_by, created_at FROM users WHERE id = ? OR uid = ?', [req.params.id, req.params.id])
  if (!user) return res.status(404).json({ code: 1, message: '用户不存在' })
  res.json({ code: 0, data: user })
})

// GET /api/user/admin-setup/check — 检查是否需要创建管理员
router.get('/admin-setup/check', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin'])
    res.json({ code: 0, data: { hasAdmin: rows.length > 0 } })
  } catch (err) {
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/user/admin-setup — 首次创建管理员账号
router.post('/admin-setup', async (req, res) => {
  try {
    // 检查是否已有管理员
    const [existing] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin'])
    if (existing.length > 0) return res.status(400).json({ code: 1, message: '管理员账号已存在，请直接登录' })

    const { username, password } = req.body
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ code: 1, message: '用户名和密码（至少6位）不能为空' })
    }

    // 检查用户名是否被占用
    const [dup] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (dup.length > 0) return res.status(400).json({ code: 1, message: '用户名已存在' })

    const hash = await bcrypt.hash(password, 10)
    const tempUid = 'ADMIN_TEMP_' + Date.now()
    const [r] = await pool.query(
      'INSERT INTO users (uid, username, password_hash, role, status) VALUES (?,?,?,?,?)',
      [tempUid, username, hash, 'admin', 1]
    )
    const uid = genUid(new Date(), r.insertId)
    const cookieToken = crypto.randomUUID().replace(/-/g, '')
    await pool.query('UPDATE users SET uid = ?, cookie_token = ? WHERE id = ?', [uid, cookieToken, r.insertId])

    const user = { id: r.insertId, uid, username, role: 'admin' }
    const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ code: 0, data: { token, user, cookie_token: cookieToken }, message: '管理员账号创建成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// POST /api/user/admin-login — 管理员登录
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ code: 1, message: '用户名和密码不能为空' })

    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'admin'])
    if (!users.length) return res.status(400).json({ code: 1, message: '管理员账号不存在' })

    const user = users[0]
    if (user.status === 0) return res.status(403).json({ code: 2, message: '该账号已被封禁' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(400).json({ code: 1, message: '密码错误' })

    const userInfo = { id: user.id, uid: user.uid, username: user.username, role: user.role, avatar: user.avatar, birthday: user.birthday, gender: user.gender }
    const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
    const cookieToken = crypto.randomUUID().replace(/-/g, '')
    await pool.query('UPDATE users SET cookie_token = ? WHERE id = ?', [cookieToken, user.id])

    res.json({ code: 0, data: { token, user: userInfo, cookie_token: cookieToken }, message: '登录成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

// 管理员创建用户
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, phone, password, status } = req.body
    if (!username || !password) return res.status(400).json({ code: 1, message: '用户名和密码不能为空' })
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR (phone IS NOT NULL AND phone = ?)', [username, phone || null])
    if (existing.length > 0) return res.status(400).json({ code: 1, message: '用户名或手机号已存在' })
    const hash = await bcrypt.hash(password, 10)
    const tempUid = 'TEMP' + Date.now() + Math.random().toString(36).substring(2, 6)
    const [r] = await pool.query(
      'INSERT INTO users (uid, username, email, phone, password_hash, status, created_by) VALUES (?,?,?,?,?,?,?)',
      [tempUid, username, email || null, phone || null, hash, status ?? 1, req.user.id]
    )
    const uid = genUid(new Date(), r.insertId)
    await pool.query('UPDATE users SET uid = ? WHERE id = ?', [uid, r.insertId])
    res.json({ code: 0, data: { id: r.insertId, uid }, message: '创建成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    // 前台用户使用 cookie_token 认证
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ code: 1, message: '登录已过期，请重新登录' })
    // 获取目标用户（查 id 或 uid）
    const [[targetUser]] = await pool.query('SELECT id, created_by FROM users WHERE id = ? OR uid = ?', [req.params.id, req.params.id])
    if (!targetUser) return res.status(404).json({ code: 1, message: '用户不存在' })
    // 权限：admin 可编辑任意用户，普通用户仅可编辑自己
    const isSelf = String(targetUser.id) === String(userId)
    // 进一步检查是否为 admin（通过 JWT token 兼容管理员后台）
    let isAdmin = false
    try {
      const authHeader = req.headers['authorization'] || ''
      let token = authHeader
      if (authHeader.startsWith('Bearer ')) token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET)
      isAdmin = decoded.role === 'admin'
    } catch {}
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ code: 1, message: '无权限修改该用户' })
    }

    const { username, email, phone, password, status, role, birthday, gender } = req.body
    const sets = []; const params = []
    if (username !== undefined) { sets.push('username = ?'); params.push(username) }
    if (email !== undefined) { sets.push('email = ?'); params.push(email || null) }
    if (phone !== undefined) { sets.push('phone = ?'); params.push(phone || null) }
    if (status !== undefined) { sets.push('status = ?'); params.push(status) }
    if (role !== undefined) { sets.push('role = ?'); params.push(role) }
    if (birthday !== undefined) { sets.push('birthday = ?'); params.push(birthday || null) }
    if (gender !== undefined) { sets.push('gender = ?'); params.push(gender || null) }
    if (password && password.length >= 6) { sets.push('password_hash = ?'); params.push(await bcrypt.hash(password, 10)) }
    if (!sets.length) return res.status(400).json({ code: 1, message: '无更新字段' })
    params.push(req.params.id)
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ? OR uid = ?`, [...params, req.params.id])
    res.json({ code: 0, message: '更新成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[targetUser]] = await pool.query('SELECT id FROM users WHERE id = ? OR uid = ?', [req.params.id, req.params.id])
    if (!targetUser) return res.status(404).json({ code: 1, message: '用户不存在' })
    await pool.query('DELETE FROM users WHERE id = ? OR uid = ?', [req.params.id, req.params.id])
    res.json({ code: 0, message: '删除成功' })
  } catch (err) { res.status(500).json({ code: 1, message: err.message }) }
})

export default router
