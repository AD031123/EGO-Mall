import pool from './db.js'

async function updateBannerProducts() {
  const conn = await pool.getConnection()
  try {
    console.log('🎨 更新轮播图商品为 二次元 > 原画集...\n')

    const products = [
      { pid: 'P_BANNER_1', name: '新世纪福音战士 原画集', sub: '庵野秀明监修 · EVA新剧场版原画精选 · 收录超200幅珍贵线稿', price: 128.00 },
      { pid: 'P_BANNER_2', name: '新海誠 天空の城 原画集', sub: '天气之子·你的名字·秒速5厘米 场景原画合集 · 全彩大开本', price: 158.00 },
      { pid: 'P_BANNER_3', name: 'CLAMP 魔法少女 原画集', sub: '魔卡少女樱25周年 · 翼·年代记精选 · CLAMP经典角色收录', price: 199.00 },
      { pid: 'P_BANNER_4', name: '进击的巨人 最终原画集', sub: '諫山創 连载完结纪念 · 分镜草图+终稿对比 · 含特别访谈', price: 168.00 },
      { pid: 'P_BANNER_5', name: '宫崎骏 吉卜力 场景原画集', sub: '龙猫·千与千寻·哈尔的移动城堡 手绘线稿 · 收录未公开分镜', price: 238.00 }
    ]

    for (const r of products) {
      await conn.query(
        'UPDATE products SET name = ?, subtitle = ?, category_l1 = 32, category_l2 = 33 WHERE product_id = ?',
        [r.name, r.sub, r.pid]
      )
      await conn.query(
        'UPDATE product_skus SET spec_name = ?, price = ? WHERE product_id = ?',
        ['原画集', r.price, r.pid]
      )
      console.log(`  ✅ ${r.pid} → "${r.name}" ¥${r.price.toFixed(2)}`)
    }

    console.log('\n✨ 完成！所有轮播图商品已更新为 二次元 > 原画集')
  } catch (e) {
    console.error('❌ 失败:', e.message)
  } finally {
    conn.release()
    await pool.end()
  }
}

updateBannerProducts()
