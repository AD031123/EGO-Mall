const BASE = '/api'

// 从 localStorage 获取管理员 token
function getToken() {
  return localStorage.getItem('ego_admin_token') || ''
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  // 自动带上认证 token（前台 token，服务端 verifyToken 会检查 role === 'admin'）
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = `请求失败 (${res.status})`
    try {
      const json = JSON.parse(text)
      message = json.message || message
    } catch {}
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

// ---------- 统计数据 ----------
export function getAnalyticsOverview() {
  return request('/analytics/overview')
}
export function getAnalyticsTrend() {
  return request('/analytics/trend')
}

export function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request(`/products${qs ? '?' + qs : ''}`)
}

export function getProduct(id) {
  return request(`/products/${id}`)
}

export function createProduct(data) {
  return request('/products', { method: 'POST', body: JSON.stringify(data) })
}

export function updateProduct(id, data) {
  return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' })
}

// ---------- 用户管理 ----------
export function getUsers(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request(`/user/list${qs ? '?' + qs : ''}`)
}

export function getUser(id) { return request(`/user/${id}`) }
export function createUser(data) { return request('/user', { method: 'POST', body: JSON.stringify(data) }) }
export function updateUser(id, data) { return request(`/user/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteUser(id) { return request(`/user/${id}`, { method: 'DELETE' }) }

// ---------- 订单管理 ----------
export function getOrders(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request(`/orders${qs ? '?' + qs : ''}`)
}
export function getOrder(id) { return request(`/orders/${id}`) }
export function createOrder(data) { return request('/orders', { method: 'POST', body: JSON.stringify(data) }) }
export function updateOrder(id, data) { return request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteOrder(id) { return request(`/orders/${id}`, { method: 'DELETE' }) }

// ---------- 分类管理 ----------
export function getCategories(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request(`/categories${qs ? '?' + qs : ''}`)
}
export function getCategoriesTree() {
  return request('/categories/tree')
}
export function createCategory(data) {
  return request('/categories', { method: 'POST', body: JSON.stringify(data) })
}
export function updateCategory(id, data) {
  return request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' })
}

// ---------- 优惠券管理 ----------
export function getCoupons(productId) {
  return request(`/coupons?product_id=${productId}`)
}
export function createCoupon(data) {
  return request('/coupons', { method: 'POST', body: JSON.stringify(data) })
}
export function deleteCoupon(id) {
  return request(`/coupons/${id}`, { method: 'DELETE' })
}

// ---------- 退货管理 ----------
export function getPendingReturns() {
  return request('/orders/returns/pending')
}
export function approveReturn(id) {
  return request(`/orders/${id}/return/approve`, { method: 'POST' })
}
export function rejectReturn(id, rejectReason = '') {
  return request(`/orders/${id}/return/reject`, { method: 'POST', body: JSON.stringify({ reject_reason: rejectReason }) })
}
