import { Router } from 'express'
import pool from '../db.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/analytics/overview — 今日概况 + 与昨天同比
router.get('/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[todayRow]] = await pool.query(
      'SELECT page_views, product_clicks, deal_amount FROM analytics_daily WHERE stat_date = CURDATE()'
    )
    const [[yesterdayRow]] = await pool.query(
      'SELECT page_views, product_clicks, deal_amount FROM analytics_daily WHERE stat_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)'
    )

    const t = todayRow || { page_views: 0, product_clicks: 0, deal_amount: 0 }
    const y = yesterdayRow || { page_views: 0, product_clicks: 0, deal_amount: 0 }

    function pct(cur, prev) {
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 100)
    }

    // 网站运行天数（从第一笔统计数据算起）
    const [[first]] = await pool.query('SELECT MIN(stat_date) AS first_date FROM analytics_daily')
    const runDays = first && first.first_date
      ? Math.ceil((new Date() - new Date(first.first_date)) / 86400000) + 1
      : 1

    res.json({
      code: 0,
      data: {
        run_days: runDays,
        today: {
          page_views: Number(t.page_views),
          product_clicks: Number(t.product_clicks),
          deal_amount: Number(t.deal_amount)
        },
        yesterday: {
          page_views: Number(y.page_views),
          product_clicks: Number(y.product_clicks),
          deal_amount: Number(y.deal_amount)
        },
        compare: {
          page_views_pct: pct(Number(t.page_views), Number(y.page_views)),
          product_clicks_pct: pct(Number(t.product_clicks), Number(y.product_clicks)),
          deal_amount_pct: pct(Number(t.deal_amount), Number(y.deal_amount))
        }
      }
    })
  } catch (err) {
    console.error('GET /api/analytics/overview error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// GET /api/analytics/trend — 近7天数据
router.get('/trend', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT stat_date, page_views, product_clicks, deal_amount
      FROM analytics_daily
      WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      ORDER BY stat_date ASC
    `)
    // 补全没有数据的日期
    const map = {}
    for (const r of rows) {
      // MySQL stat_date 是 UTC，加 8 小时得到北京时间当日
      const ds = new Date(r.stat_date)
      const localDs = ds.getFullYear() + '-' +
        String(ds.getMonth() + 1).padStart(2, '0') + '-' +
        String(ds.getDate()).padStart(2, '0')
      map[localDs] = r
    }
    const days = []
    const base = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    const list = days.map(ds => ({
      date: ds,
      page_views: Number((map[ds] || {}).page_views || 0),
      product_clicks: Number((map[ds] || {}).product_clicks || 0),
      deal_amount: Number((map[ds] || {}).deal_amount || 0)
    }))
    res.json({ code: 0, data: list })
  } catch (err) {
    console.error('GET /api/analytics/trend error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

// POST /api/analytics/event — 记录事件（前端埋点上报），公开接口
router.post('/event', async (req, res) => {
  try {
    const { type, value, extra } = req.body
    if (!type) return res.status(400).json({ code: 1, message: '缺少事件类型' })

    if (type === 'page_view') {
      await pool.query(
        `INSERT INTO analytics_daily (stat_date, page_views) VALUES (CURDATE(), 1)
         ON DUPLICATE KEY UPDATE page_views = page_views + 1`
      )
    } else if (type === 'product_click') {
      await pool.query(
        `INSERT INTO analytics_daily (stat_date, product_clicks) VALUES (CURDATE(), 1)
         ON DUPLICATE KEY UPDATE product_clicks = product_clicks + 1`
      )
    } else if (type === 'deal') {
      await pool.query(
        `INSERT INTO analytics_daily (stat_date, deal_amount) VALUES (CURDATE(), ?)
         ON DUPLICATE KEY UPDATE deal_amount = deal_amount + VALUES(deal_amount)`,
        [value || 0]
      )
    }

    // 写入事件表（可选）
    await pool.query(
      'INSERT INTO analytics_events (event_type, event_value, extra) VALUES (?,?,?)',
      [type, value || null, extra ? JSON.stringify(extra) : null]
    )

    res.json({ code: 0, message: 'ok' })
  } catch (err) {
    console.error('POST /api/analytics/event error:', err)
    res.status(500).json({ code: 1, message: err.message })
  }
})

export default router
