const BASE = '/api'

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = text || `请求失败 (${res.status})`
    // 尝试解析 JSON 响应提取消息
    try {
      const json = JSON.parse(text)
      if (json.message) message = json.message
    } catch {}
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

// 发送带 cookie_token 的已认证请求
function authRequest(url, options = {}) {
  const token = localStorage.getItem('ego_cookie') || ''
  return request(url, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': token }
  })
}

export function getShopProducts(page = 1, pageSize = 24, extraParams = {}) {
  const qs = new URLSearchParams({ page, pageSize, ...extraParams }).toString()
  return request(`/shop/products?${qs}`)
}

export function searchShopProducts(q, page = 1, pageSize = 24) {
  return request(`/shop/products/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`)
}

export function getShopProductDetail(id) {
  return request(`/shop/products/${id}`)
}

export function login(data) {
  return request('/user/login', { method: 'POST', body: JSON.stringify(data) })
}

export function logout(uid) {
  return request('/user/logout', { method: 'POST', body: JSON.stringify({ uid }) })
}

export function register(data) {
  return request('/user/register', { method: 'POST', body: JSON.stringify(data) })
}

export function autoLogin(cookieToken) {
  return request('/user/auto-login', { method: 'POST', body: JSON.stringify({ cookie_token: cookieToken }) })
}

export function updateUser(id, data) {
  return authRequest(`/user/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function uploadAvatarFile(uid, image) {
  return authRequest('/user/upload-avatar', { method: 'POST', body: JSON.stringify({ uid, image }) })
}

// ---------- 购物车 ----------
export function getCart() {
  return authRequest('/cart')
}
export function addToCart(data) {
  return authRequest('/cart', { method: 'POST', body: JSON.stringify(data) })
}
export function updateCartItem(id, data) {
  return authRequest(`/cart/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function removeCartItem(id) {
  return authRequest(`/cart/${id}`, { method: 'DELETE' })
}
export function clearCart() {
  return authRequest('/cart', { method: 'DELETE' })
}

// ---------- 收货地址 ----------
export function getAddresses() {
  return authRequest('/address')
}
export function createAddress(data) {
  return authRequest('/address', { method: 'POST', body: JSON.stringify(data) })
}
export function updateAddress(id, data) {
  return authRequest(`/address/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteAddress(id) {
  return authRequest(`/address/${id}`, { method: 'DELETE' })
}

// ---------- 订单 ----------
export function getMyOrders(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return authRequest(`/orders${qs ? '?' + qs : ''}`)
}
export function getMyOrderDetail(orderId) {
  return authRequest(`/orders/group/${orderId}`)
}
export function placeOrder(data) {
  return authRequest('/orders', { method: 'POST', body: JSON.stringify(data) })
}
export function returnOrder(id, reason = '') {
  return authRequest(`/orders/${id}/return`, { method: 'POST', body: JSON.stringify({ reason }) })
}
export function approveReturn(id) {
  return authRequest(`/orders/${id}/return/approve`, { method: 'POST' })
}
export function rejectReturn(id, rejectReason = '') {
  return authRequest(`/orders/${id}/return/reject`, { method: 'POST', body: JSON.stringify({ reject_reason: rejectReason }) })
}
export function getReturnMessages() {
  return authRequest('/orders/returns/messages')
}

// ---------- 管理员认证 ----------
export function checkAdminSetup() {
  return request('/user/admin-setup/check')
}

export function createAdminAccount(data) {
  return request('/user/admin-setup', { method: 'POST', body: JSON.stringify(data) })
}

export function adminLogin(data) {
  return request('/user/admin-login', { method: 'POST', body: JSON.stringify(data) })
}

export function getCoupons(productId) {
  return request(`/coupons?product_id=${productId}`)
}
export function claimCoupon(couponId) {
  return authRequest('/coupons/claim', { method: 'POST', body: JSON.stringify({ coupon_id: couponId }) })
}
export function getMyCoupons() {
  return authRequest('/coupons/my')
}
export function checkClaimedCoupons(productId) {
  return authRequest(`/coupons/check?product_id=${productId}`)
}
export function getDealsCoupons() {
  return request('/coupons/deals')
}
