import jwt from 'jsonwebtoken'
import pool from '../db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'ego-mall-secret-key-2024'
export const JWT_EXPIRES = '7d'

// ========== JWT 认证中间件 ==========
// 验证 Authorization: Bearer <token>，将用户信息挂到 req.user
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || ''
    let token = authHeader
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    if (!token) {
      return res.status(401).json({ code: 1, message: '请先登录' })
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role || 'admin' }
    next()
  } catch (err) {
    return res.status(401).json({ code: 1, message: '登录已过期，请重新登录' })
  }
}

// ========== 管理员权限检查 ==========
// 必须在 verifyToken 之后使用。管理员登录即拥有所有数据操作权限
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 1, message: '无管理员权限' })
  }
  next()
}

// ========== 前台用户认证（cookie_token 方式） ==========
// 供购物车、地址、退货申请等前台接口使用，不改动
export async function getUserId(req) {
  const token = req.headers['authorization'] || req.query._token || ''
  if (!token) return null
  try {
    const [[u]] = await pool.query('SELECT id FROM users WHERE cookie_token = ?', [token])
    return u ? u.id : null
  } catch {
    return null
  }
}
