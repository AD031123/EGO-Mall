# 🛒 EGO Mall

基于 **Vue 3 + Express** 的全栈电商平台，包含前台商城与后台管理系统，支持商品管理、用户管理、订单管理、优惠券、分类管理等功能。

---

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| [Vue 3](https://vuejs.org/) | 渐进式 JavaScript 框架（Composition API） |
| [Vue Router 4](https://router.vuejs.org/) | 单页应用路由 |
| [Vite 7](https://vite.dev/) | 极速开发构建工具 |
| [Bootstrap 5](https://getbootstrap.com/) | UI 组件库与样式框架 |
| [marked](https://marked.js.org/) | Markdown 渲染（商品描述） |

### 后端
| 技术 | 说明 |
|------|------|
| [Express 5](https://expressjs.com/) | Node.js Web 框架 |
| [MySQL2](https://github.com/sidorares/node-mysql2) | MySQL 数据库驱动 |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | JWT 身份认证 |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 密码哈希加密 |
| [cors](https://github.com/expressjs/cors) | 跨域请求处理 |

### 数据库
- **MySQL** — 单库 `ego-mall`，包含 users、products、categories、orders、coupons 等表

---

## 项目结构

```
EGO-Mall/
├── server/                    # Express 后端
│   ├── index.js               # 服务入口，路由挂载
│   ├── db.js                  # MySQL 连接池
│   ├── migrate.js             # 数据库表结构初始化
│   ├── middleware/
│   │   └── auth.js            # JWT 认证中间件 & 权限校验
│   └── routes/
│       ├── products.js        # 商品 CRUD
│       ├── user.js            # 用户注册/登录 & 管理端用户 CRUD
│       ├── shop.js            # 前台公开接口（商品列表/详情）
│       ├── categories.js      # 分类管理
│       ├── orders.js          # 订单管理 & 退货处理
│       ├── cart.js            # 购物车
│       ├── address.js         # 收货地址
│       ├── coupon.js          # 优惠券
│       ├── brands.js          # 品牌管理
│       ├── tags.js            # 标签管理
│       └── analytics.js       # 数据统计 & 埋点
├── src/                       # Vue 3 前端
│   ├── api/
│   │   ├── products.js        # 后台 API 调用（自动携带 JWT）
│   │   └── shop.js            # 前台 API 调用（cookie_token 认证）
│   ├── router/
│   │   └── index.js           # 路由配置 & 导航守卫
│   ├── views/                 # 后台管理页面
│   │   ├── Home.vue           # 仪表盘
│   │   ├── Products.vue       # 商品管理
│   │   ├── Users.vue          # 用户管理
│   │   ├── Orders.vue         # 订单管理
│   │   ├── Returns.vue        # 退货管理
│   │   ├── AdminSetup.vue     # 管理员初始化/登录
│   │   ├── Forbidden.vue      # 403 禁止访问页
│   │   └── NotFound.vue       # 404 未找到页
│   ├── components/            # 后台公共组件
│   │   ├── Navbar.vue         # 顶栏
│   │   ├── Sidebar.vue        # 侧栏
│   │   ├── ConfirmModal.vue   # 确认弹窗
│   │   └── CropDialog.vue     # 图片裁剪
│   ├── shop/                  # 前台商城
│   │   ├── ShopLayout.vue     # 前台布局
│   │   ├── ShopNavbar.vue     # 前台导航栏
│   │   ├── views/             # 前台页面
│   │   │   ├── ShopHome.vue   # 首页
│   │   │   ├── Category.vue   # 分类浏览
│   │   │   ├── Hot.vue        # 热销榜
│   │   │   ├── Deals.vue      # 优惠专区
│   │   │   ├── ShopDetail.vue # 商品详情
│   │   │   ├── Login.vue      # 登录/注册
│   │   │   ├── Profile.vue    # 个人中心
│   │   │   └── Orders.vue     # 我的订单
│   │   └── components/        # 前台公共组件
│   └── composables/
│       └── useToast.js        # 全局 Toast 消息
└── public/
    └── user/                  # 用户头像存储
```

---

## 快速开始

### 环境要求

- **Node.js** >= 20.19 或 >= 22.12
- **MySQL** >= 8.0
- **pnpm**（推荐）或 npm

### 1. 克隆并安装依赖

```bash
git clone <your-repo-url>
cd EGO-Mall
pnpm install
```

### 2. 配置数据库

确保 MySQL 已启动，然后编辑 `server/db.js` 修改数据库连接信息：

```js
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'ego-mall',
})
```

### 3. 初始化数据库

```bash
node server/migrate.js
```

### 4. 启动开发服务器

```bash
pnpm dev
```

此命令会同时启动：
- **Express API 服务** → `http://localhost:3001`
- **Vite 前端开发服务** → `http://localhost:5173`

Vite 已配置代理，前端 `/api/*` 请求会自动转发到后端。

### 5. 首次使用

1. 打开 `http://localhost:5173/admin-setup`
2. 按照引导创建管理员账号
3. 创建完成后自动跳转后台管理首页

> 管理员和普通用户共用同一套登录体系。管理员在前台登录后，也可在个人中心开启「管理员权限」开关（测试用途）来获得后台访问权限。

---

## 权限体系

| 概念 | 说明 |
|------|------|
| **前台用户** | 注册/登录后浏览商品、下单、管理地址 |
| **后台管理员** | `role = 'admin'` 的用户，可访问 `/admin` 管理后台 |
| **数据归属** | 每个管理员创建的数据（商品/分类/用户等）记录 `created_by`，其他管理员无法修改或删除 |
| **JWT 认证** | 登录后签发含 `role` 字段的 JWT，后台 API 通过 `verifyToken + requireAdmin` 中间件校验 |
| **存量数据** | 迁移前创建的数据 `created_by = NULL`，允许所有管理员操作 |

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前后端开发服务 |
| `pnpm build` | 构建生产包 |
| `pnpm preview` | 预览生产构建 |
| `node server/index.js` | 单独启动后端 |
| `node server/migrate.js` | 初始化数据库表结构 |
| `node server/migrate-ownership.js` | 添加数据权限字段并回填存量数据 |

---

## API 概览

| 前缀 | 认证 | 说明 |
|------|------|------|
| `/api/shop/*` | 无（公开） | 前台商品浏览、搜索 |
| `/api/user/register` | 无 | 用户注册 |
| `/api/user/login` | 无 | 用户登录 |
| `/api/user/admin-setup` | 无 | 首次管理员创建 |
| `/api/user/*` | JWT (admin) | 用户管理 CRUD |
| `/api/products/*` | JWT (admin) | 商品管理 CRUD |
| `/api/categories/*` | GET 公开，写 JWT (admin) | 分类管理 |
| `/api/orders/*` | 混合（前台 cookie_token，后台 JWT） | 订单管理 & 退货 |
| `/api/cart/*` | cookie_token | 购物车 |
| `/api/address/*` | cookie_token | 收货地址 |
| `/api/coupons/*` | 混合 | 优惠券 |
| `/api/brands/*` | JWT (admin) | 品牌管理 |
| `/api/tags/*` | 无（公开） | 标签查询 |
| `/api/analytics/*` | JWT (admin) | 数据统计 |

---

## License

MIT
