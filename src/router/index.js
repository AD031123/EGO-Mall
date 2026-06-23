import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ShopLayout from '@/shop/ShopLayout.vue'
import { trackPageView } from '@/utils/analytics.js'

const routes = [
  {
    path: '/',
    component: ShopLayout,
    children: [
      { path: '', name: 'ShopHome', component: () => import('@/shop/views/ShopHome.vue') },
      { path: 'category', name: 'ShopCategory', component: () => import('@/shop/views/Category.vue') },
      { path: 'hot', name: 'ShopHot', component: () => import('@/shop/views/Hot.vue') },
      { path: 'deals', name: 'ShopDeals', component: () => import('@/shop/views/Deals.vue') },
      { path: 'product/:id', name: 'ShopDetail', component: () => import('@/shop/views/ShopDetail.vue') },
      { path: 'showcase/:id', name: 'Showcase', component: () => import('@/shop/views/Showcase.vue') },
      { path: 'login', name: 'ShopLogin', component: () => import('@/shop/views/Login.vue') },
      { path: 'profile', name: 'ShopProfile', component: () => import('@/shop/views/Profile.vue') },
      { path: 'orders', name: 'ShopOrders', component: () => import('@/shop/views/Orders.vue') },
    ]
  },
  { path: '/md-edit', name: 'MdEdit', component: () => import('@/shop/views/MdEdit.vue') },
  { path: '/admin-setup', name: 'AdminSetup', component: () => import('@/views/AdminSetup.vue') },
  { path: '/403', name: 'Forbidden', component: () => import('@/views/Forbidden.vue') },
  // catch-all 兜底路由：捕获所有未匹配路径，展示 404
  { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', name: 'Home', component: () => import('@/views/Home.vue') },
      { path: 'products', name: 'Products', component: () => import('@/views/Products.vue') },
      { path: 'users', name: 'Users', component: () => import('@/views/Users.vue') },
      { path: 'orders', name: 'AdminOrders', component: () => import('@/views/Orders.vue') },
      { path: 'returns', name: 'AdminReturns', component: () => import('@/views/Returns.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫：管理端校验管理员登录态
router.beforeEach((to, from, next) => {
  // 只匹配 /admin 及其子路由，排除 /admin-setup
  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    const adminUserStr = localStorage.getItem('ego_admin_user')
    if (!adminUserStr) {
      // 未登录管理员 → 跳转管理员登录/初始化页面
      next('/admin-setup')
      return
    }
    // 检查 token 是否过期（7天）
    const expiry = localStorage.getItem('ego_admin_expiry')
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem('ego_admin_token')
      localStorage.removeItem('ego_admin_cookie')
      localStorage.removeItem('ego_admin_user')
      localStorage.removeItem('ego_admin_expiry')
      next('/admin-setup')
      return
    }
  }
  next()
})

// 全局路由守卫：每次页面跳转记录 page_view
router.afterEach((to) => {
  trackPageView(to.fullPath)
})

export default router
