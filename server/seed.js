import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const pool = mysql.createPool({ host:'localhost',user:'root',password:'88888888',database:'ego-mall' })

// category_l1=6(手机数码) category_l2=7(智能手机)
// category_l1=1(电脑办公) category_l2=2(笔记本)
// category_l1=6(手机数码) category_l2=8(平板电脑)
// category_l1=11(运动鞋服) category_l2=14(休闲鞋)
// category_l1=6(手机数码) category_l2=9(智能穿戴)
// category_l1=6(手机数码) category_l2=10(耳机/音箱)
const products = [
  { name:'iPhone 15 Pro Max',subtitle:'钛金属设计，A17 Pro 芯片',l1:6,l2:7,price:9999,img:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop',desc:'<p>全新 iPhone 15 Pro Max。</p>' },
  { name:'Samsung Galaxy S25 Ultra',subtitle:'AI 智能旗舰',l1:6,l2:7,price:8999,img:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=600&fit=crop',desc:'<p>三星年度旗舰。</p>' },
  { name:'MacBook Pro 16" M4',subtitle:'M4 Max 芯片',l1:1,l2:2,price:19999,img:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop',desc:'<p>最强大的 MacBook。</p>' },
  { name:'iPad Air M3',subtitle:'轻薄强大',l1:6,l2:8,price:5499,img:'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=600&fit=crop',desc:'<p>iPad Air 全新升级。</p>' },
  { name:'AirPods Pro 3',subtitle:'自适应降噪',l1:6,l2:10,price:1899,img:'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=600&fit=crop',desc:'<p>降噪新高度。</p>' },
  { name:'华为 Mate 70 Pro',subtitle:'北斗卫星',l1:6,l2:7,price:7999,img:'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&h=600&fit=crop',desc:'<p>华为年度旗舰。</p>' },
  { name:'小米 15 Ultra',subtitle:'徕卡光学',l1:6,l2:7,price:5999,img:'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop',desc:'<p>影像新旗舰。</p>' },
  { name:'Nike Air Max 270',subtitle:'超大 Air 气垫',l1:11,l2:14,price:899,img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',desc:'<p>舒适缓震。</p>' },
  { name:'Nike Dunk Low Retro',subtitle:'经典复古篮球鞋',l1:11,l2:13,price:749,img:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4d2?w=600&h=600&fit=crop',desc:'<p>街头潮流必备。</p>' },
  { name:'Samsung Galaxy Tab S10',subtitle:'14.6英寸 AMOLED',l1:6,l2:8,price:6299,img:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop',desc:'<p>防水防尘大屏。</p>' },
  { name:'Apple Watch Ultra 3',subtitle:'49mm 钛金属',l1:6,l2:9,price:6499,img:'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=600&fit=crop',desc:'<p>探险级手表。</p>' },
  { name:'Mac mini M4 Pro',subtitle:'桌面小钢炮',l1:1,l2:3,price:10999,img:'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=600&fit=crop',desc:'<p>小巧强劲。</p>' },
  { name:'OPPO Find X8 Pro',subtitle:'哈苏影像',l1:6,l2:7,price:5399,img:'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=600&h=600&fit=crop',desc:'<p>影像大师。</p>' },
  { name:'vivo X200 Pro',subtitle:'蔡司 APO 长焦',l1:6,l2:7,price:4999,img:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',desc:'<p>2亿像素。</p>' },
  { name:'荣耀 Magic 7 Pro',subtitle:'青海湖电池',l1:6,l2:7,price:5699,img:'https://images.unsplash.com/photo-1515940175183-6798529cb860?w=600&h=600&fit=crop',desc:'<p>超长续航。</p>' },
  { name:'Samsung Galaxy Book 4',subtitle:'15.6英寸轻薄本',l1:1,l2:2,price:7299,img:'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop',desc:'<p>Intel Core Ultra。</p>' },
  { name:'Samsung Galaxy Buds 3 Pro',subtitle:'智能 ANC',l1:6,l2:10,price:1499,img:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',desc:'<p>沉浸式音效。</p>' },
  { name:'Nike Air Force 1',subtitle:'经典纯白',l1:11,l2:14,price:799,img:'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=600&fit=crop',desc:'<p>永不过时。</p>' },
  { name:'Nike React Infinity Run',subtitle:'流畅缓震',l1:11,l2:12,price:999,img:'https://images.unsplash.com/photo-1562183241-840b8af0721a?w=600&h=600&fit=crop',desc:'<p>稳定支撑。</p>' },
  { name:'Samsung ViewFinity S9',subtitle:'5K 专业显示器',l1:1,l2:5,price:8999,img:'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop',desc:'<p>27英寸 5K。</p>' },
]

const subs = [
  'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop',
]

async function seed() {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 测试用户
    const hash = await bcrypt.hash('123456', 10)
    const now = new Date()
    const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2,'0'); const d = String(now.getDate()).padStart(2,'0')
    const [ur] = await conn.query('INSERT INTO users (uid, username, email, phone, password_hash) VALUES (?,?,?,?,?)',
      ['TEMP','testuser','test@ego.com','13800000000',hash])
    const uid = `U${y}${m}${d}${String(ur.insertId).padStart(4,'0')}${Math.floor(Math.random()*90)+10}`
    await conn.query('UPDATE users SET uid = ? WHERE id = ?', [uid, ur.insertId])
    console.log('✓ 测试用户已创建 (testuser / 123456, uid='+uid+')')

    let i = 1
    for (const p of products) {
      const pid = 'P' + String(i).padStart(4, '0')
      const imgs = [subs[i % 3], subs[(i + 1) % 3]]
      await conn.query(
        'INSERT INTO products (product_id,name,subtitle,category_l1,category_l2,main_image,images,description,status) VALUES (?,?,?,?,?,?,?,?,1)',
        [pid, p.name, p.subtitle, p.l1, p.l2, p.img, JSON.stringify(imgs), p.desc]
      )
      // 插入默认规格
      await conn.query(
        'INSERT INTO product_skus (product_id, spec_name, price, stock, sort_order) VALUES (?,?,?,?,1)',
        [pid, '默认', p.price, 100]
      )
      i++
    }
    await conn.commit()
    console.log(`✓ ${products.length} 条测试商品已创建`)
  } catch (e) {
    await conn.rollback()
    console.error('失败:', e.message)
  } finally { conn.release(); await pool.end() }
}

seed()
