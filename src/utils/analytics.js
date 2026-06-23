const BASE = '/api'

// 上报事件到后端
async function track(type, value, extra) {
  try {
    await fetch(`${BASE}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value, extra })
    })
  } catch {
    // 静默失败，不影响主流程
  }
}

// 页面浏览
export function trackPageView(path) {
  track('page_view', null, { path })
}

// 商品点击
export function trackProductClick(productId) {
  track('product_click', null, { product_id: productId })
}

// 成交金额
export function trackDeal(amount, extra) {
  track('deal', amount, extra)
}
