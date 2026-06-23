import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import productsRouter from './routes/products.js'
import shopRouter from './routes/shop.js'
import userRouter from './routes/user.js'
import categoriesRouter from './routes/categories.js'
import ordersRouter from './routes/orders.js'
import cartRouter from './routes/cart.js'
import addressRouter from './routes/address.js'
import couponRouter from './routes/coupon.js'
import analyticsRouter from './routes/analytics.js'
import brandsRouter from './routes/brands.js'
import tagsRouter from './routes/tags.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 托管 public 目录（头像等静态文件）
app.use(express.static(path.resolve(__dirname, '../public')))

app.use('/api/products', productsRouter)
app.use('/api/shop', shopRouter)
app.use('/api/user', userRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/cart', cartRouter)
app.use('/api/address', addressRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/brands', brandsRouter)
app.use('/api/tags', tagsRouter)

app.listen(PORT, () => {
  console.log(`EGO-Mall API server running on http://localhost:${PORT}`)
})
