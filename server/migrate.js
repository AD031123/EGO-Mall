import pool from './db.js'

async function migrate() {
  const conn = await pool.getConnection()
  try {
    console.log('删除所有旧表...')

    // 关闭外键检查，避免表间依赖报错
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')

    // 删除所有旧表
    const tables = ['cart_item', 'product_tag', 'product_attribute', 'attribute', 'product_image', 'sku', 'tag', 'brand', 'category', 'categories', 'product', 'user', 'orders', 'users', 'products']
    for (const t of tables) {
      try { await conn.query(`DROP TABLE IF EXISTS \`${t}\``); console.log(`  ✓ 已删除 ${t}`) } catch {}
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    console.log('\n创建新表...')

    // 1. 用户表（邮箱不唯一，手机号唯一）
    await conn.query(`
      CREATE TABLE \`users\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`uid\` VARCHAR(32) NOT NULL,
        \`username\` VARCHAR(64) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(128) DEFAULT NULL,
        \`phone\` VARCHAR(20) DEFAULT NULL,
        \`avatar\` VARCHAR(500) DEFAULT NULL,
        \`status\` TINYINT DEFAULT 1,
        \`cookie_token\` VARCHAR(255) DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_uid\` (\`uid\`),
        UNIQUE KEY \`uk_username\` (\`username\`),
        UNIQUE KEY \`uk_phone\` (\`phone\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('  ✓ users 表已创建')

    // 2. 商品表
    await conn.query(`
      CREATE TABLE \`products\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`product_id\` VARCHAR(32) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`subtitle\` VARCHAR(500) DEFAULT NULL,
        \`category_l1\` INT DEFAULT NULL,
        \`category_l2\` INT DEFAULT NULL,
        \`main_image\` VARCHAR(500) DEFAULT NULL,
        \`images\` JSON DEFAULT NULL,
        \`description\` TEXT,
        \`status\` TINYINT DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_product_id\` (\`product_id\`),
        INDEX \`idx_category_l1\` (\`category_l1\`),
        INDEX \`idx_category_l2\` (\`category_l2\`),
        INDEX \`idx_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('  ✓ products 表已创建')

    // 3. 分类表
    await conn.query(`
      CREATE TABLE \`categories\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`parent_id\` INT DEFAULT 0,
        \`name\` VARCHAR(64) NOT NULL,
        \`sort_order\` INT DEFAULT 0,
        INDEX \`idx_parent\` (\`parent_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('  ✓ categories 表已创建')

    // 种子分类数据
    const cats = [
      [1,0,'电脑办公',1],[2,1,'笔记本',1],[3,1,'台式机',2],[4,1,'一体机',3],[5,1,'工作站',4],
      [6,0,'手机数码',2],[7,6,'智能手机',1],[8,6,'平板电脑',2],[9,6,'智能穿戴',3],[10,6,'耳机/音箱',4],
      [11,0,'运动鞋服',3],[12,11,'跑步鞋',1],[13,11,'篮球鞋',2],[14,11,'休闲鞋',3],[15,11,'运动服饰',4]
    ]
    for (const [id,pid,name,sort] of cats) {
      await conn.query('INSERT INTO categories (id,parent_id,name,sort_order) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), parent_id=VALUES(parent_id)', [id,pid,name,sort])
    }
    console.log('  ✓ 分类种子数据已插入')

    // 3.5. 规格表
    await conn.query(`
      CREATE TABLE \`product_skus\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`product_id\` VARCHAR(32) NOT NULL,
        \`spec_name\` VARCHAR(128) NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`stock\` INT DEFAULT 0,
        \`sort_order\` INT DEFAULT 0,
        INDEX \`idx_product_id\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('  ✓ product_skus 表已创建')

    // 4. 订单表
    await conn.query(`
      CREATE TABLE \`orders\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`order_id\` VARCHAR(32) NOT NULL,
        \`user_id\` INT NOT NULL,
        \`username\` VARCHAR(64) NOT NULL,
        \`product_id\` INT NOT NULL,
        \`product_name\` VARCHAR(255) DEFAULT NULL,
        \`sku_name\` VARCHAR(128) DEFAULT NULL,
        \`unit_price\` DECIMAL(10,2) NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`total_amount\` DECIMAL(10,2) DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_order_id\` (\`order_id\`),
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_product_id\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('  ✓ orders 表已创建')

    console.log('\n✓ 迁移完成！')
  } catch (e) {
    console.error('迁移失败:', e.message)
  } finally {
    conn.release()
    await pool.end()
  }
}

migrate()
