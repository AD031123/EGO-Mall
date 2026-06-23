import jwt from 'jsonwebtoken'
import pool from '../db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'ego-mall-secret-key-2024'
export const JWT_EXPIRES = '7d'

// ========== JWT 认证中间件 ==========
// 验证 Authorization: Bearer <token>，将用户信息挂到 req.user
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || ''
    // 兼容 Bearer <token> 和直接的 cookie_token 两种格式
    let token = authHeader
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    if (!token) {
      return res.status(401).json({ code: 1, message: '请先登录' })
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role || 'user' }
    next()
  } catch (err) {
    return res.status(401).json({ code: 1, message: '登录已过期，请重新登录' })
  }
}

// ========== 管理员权限检查 ==========
// 必须在 verifyToken 之后使用
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 1, message: '无管理员权限' })
  }
  next()
}

// ========== 数据归属检查工具函数 ==========
// 查询记录的 created_by 字段，与当前用户比较
// created_by 为 NULL（存量数据）时放行
export async function checkOwnership(table, id, userId) {
  if (!id || !userId) return { allowed: false, reason: 'missing params' }
  try {
    const [[row]] = await pool.query(
      `SELECT created_by FROM ${table} WHERE id = ?`,
      [id]
    )
    if (!row) return { allowed: false, reason: 'not found' }
    // 存量数据 created_by 为 NULL，允许操作（向后兼容）
    if (row.created_by === null) return { allowed: true }
    if (row.created_by !== userId) return { allowed: false, reason: 'not owner' }
    return { allowed: true }
  } catch (err) {
    return { allowed: false, reason: err.message }
  }
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
