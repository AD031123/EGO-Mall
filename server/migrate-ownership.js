// 数据权限迁移脚本：为各业务表添加 created_by 字段
// 运行方式：node server/migrate-ownership.js

import pool from './db.js'

const MIGRATIONS = [
  { table: 'products', desc: '商品' },
  { table: 'categories', desc: '分类' },
  { table: 'coupons', desc: '优惠券' },
  { table: 'orders', desc: '订单' },
  { table: 'brand', desc: '品牌' },
  { table: 'users', desc: '用户' },
]

async function run() {
  console.log('=== EGO-Mall 数据权限迁移 ===\n')

  // 1. 添加 created_by 列
  for (const m of MIGRATIONS) {
    try {
      await pool.query(`ALTER TABLE ${m.table} ADD COLUMN created_by INT DEFAULT NULL`)
      console.log(`[OK] ${m.table} 添加 created_by 列`)
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`[跳过] ${m.table} 已存在 created_by 列`)
      } else {
        console.error(`[失败] ${m.table}: ${err.message}`)
      }
    }
  }

  // 2. 回填存量数据：根据 products.created_phone 匹配用户 ID
  try {
    const [result] = await pool.query(`
      UPDATE products p
      LEFT JOIN users u ON p.created_phone = u.phone AND u.role = 'admin'
      SET p.created_by = u.id
      WHERE p.created_by IS NULL AND p.created_phone IS NOT NULL AND u.id IS NOT NULL
    `)
    console.log(`\n[OK] products 回填 created_by（按 created_phone -> users.id）: ${result.affectedRows} 条`)
  } catch (err) {
    console.error(`[失败] products 回填: ${err.message}`)
  }

  // 3. 统计各表 NULL 数量
  console.log('\n--- 各表 created_by NULL 统计 ---')
  for (const m of MIGRATIONS) {
    try {
      const [[{ cnt }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM ${m.table} WHERE created_by IS NULL`)
      if (cnt > 0) {
        console.log(`  ${m.table}: ${cnt} 条记录 created_by 为 NULL（存量数据，允许多管理员操作）`)
      } else {
        console.log(`  ${m.table}: 全部已赋值`)
      }
    } catch (err) {
      console.log(`  ${m.table}: 查询失败 - ${err.message}`)
    }
  }

  console.log('\n=== 迁移完成 ===')
  process.exit(0)
}

run()
