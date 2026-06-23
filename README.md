# 🛒 EGO Mall

基于 **Vue 3 + Express** 的全栈电商平台，包含前台商城与独立后台管理系统，支持商品管理、用户管理、订单管理、优惠券、分类管理等功能。

---

## 技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| [Vue 3](https://vuejs.org/) | ^3.5 | 渐进式 JavaScript 框架（Composition API） |
| [Vue Router 4](https://router.vuejs.org/) | ^4.6 | 单页应用路由 |
| [Vite](https://vite.dev/) | ^7.2 | 极速开发构建工具 |
| [Bootstrap 5](https://getbootstrap.com/) | latest | UI 组件库与样式框架 |
| [marked](https://marked.js.org/) | ^18.0 | Markdown 渲染（商品描述） |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| [Express](https://expressjs.com/) | ^5.2 | Node.js Web 框架 |
| [mysql2](https://github.com/sidorares/node-mysql2) | ^3.22 | MySQL 数据库驱动 |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | ^9.0 | JWT 身份认证 |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | ^3.0 | 密码哈希加密 |
| [cors](https://github.com/expressjs/cors) | ^2.8 | 跨域请求处理 |

### 开发工具
| 技术 | 版本 | 说明 |
|------|------|------|
| [concurrently](https://github.com/open-cli-tools/concurrently) | ^10.0 | 同时运行前后端开发服务 |

### 数据库
- **MySQL** ≥ 8.0 — 单库 `ego-mall`，包含 users、products、categories、orders、coupons 等表

---

## 项目结构

```
EGO-Mall/
├── server/                    # Express 后端
│   ├── index.js               # 服务入口，路由挂载
│   ├── db.js                  # MySQL 连接池
│   ├── migrate.js             # 数据库表结构初始化
│   ├── middleware/
│   │   └── auth.js            # JWT 认证中间件
│   └── routes/
│       ├── products.js        # 商品 CRUD
│       ├── user.js            # 前台注册/登录 & 管理员 CRUD
│       ├── shop.js            # 商城公开接口（商品列表/详情）
│       ├── categories.js      # 分类管理
│       ├── orders.js          # 订单管理 & 退货处理
│       ├── cart.js            # 购物车
│       ├── address.js         # 收货地址
│       ├── coupon.js          # 优惠券
│       ├── brands.js          # 品牌管理
│       ├── tags.js            # 标签管理
│       └── analytics.js       # 埋点统计
├── src/                       # Vue 3 前端
│   ├── api/
│   │   ├── products.js        # 后台 API 调用（携带管理员 JWT）
│   │   └── shop.js            # 前台 API 调用
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
│   │   └── ConfirmModal.vue   # 确认弹窗
│   ├── shop/                  # 前台商城
│   │   ├── ShopLayout.vue     # 前台布局
│   │   ├── ShopNavbar.vue     # 前台导航栏
│   │   ├── views/             # 前台页面
│   │   └── components/        # 前台公共组件
│   └── composables/
│       └── useToast.js        # 全局 Toast 消息
└── public/
    ├── user/                  # 用户头像存储
    └── images/                # 登录/注册封面图
```

---

## 快速开始

### 环境要求

- **Node.js** ≥ 20.19 或 ≥ 22.12
- **MySQL** ≥ 8.0
- **npm**（推荐）

### 1. 克隆并安装依赖

```bash
git clone <your-repo-url>
cd EGO-Mall
npm install
```

### 2. 配置数据库

确保 MySQL 已启动并创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS `ego-mall` DEFAULT CHARSET utf8mb4;
```

然后编辑 `server/db.js` 修改连接信息（如需要）：

```js
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'ego-mall',
})
```

### 3. 初始化数据库表结构

```bash
node server/migrate.js
```

### 4. 启动开发服务器

```bash
npm run dev
```

此命令会同时启动两个服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| Express API | `http://localhost:3001` | 后端 API 服务 |
| Vite DevServer | `http://localhost:5173` | 前端开发服务（含 HMR） |

Vite 已配置代理，前端 `/api/*` 请求会自动转发到 `http://localhost:3001`。

### 5. 首次使用 — 创建管理员

1. 浏览器打开 `http://localhost:5173/admin-setup`
2. 系统会检测到无管理员账号，显示欢迎初始化页面
3. 输入管理员用户名和密码，点击「创建管理员账号」
4. 创建成功后自动跳转后台管理首页 `http://localhost:5173/admin`

> 之后访问 `/admin` 会进入管理员登录页，使用已创建的管理员账号登录即可。

---

## 权限体系

| 概念 | 说明 |
|------|------|
| **前台用户** | 通过商城注册/登录，浏览商品、下单、管理地址和订单 |
| **后台管理员** | 独立于前台的管理员账号（`role = 'admin'`），拥有所有数据完全操作权限 |
| **认证方式** | 管理员通过 `/admin-setup` 创建或登录，JWT 独立存储于 `ego_admin_*` keys，与前台 `ego_*` keys 完全隔离 |
| **登录有效期** | 7 天，过期后需重新登录 |

---

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run build` | 构建生产包到 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `node server/index.js` | 单独启动后端 API 服务 |
| `node server/migrate.js` | 初始化/更新数据库表结构 |

---

## API 概览

| 前缀 | 认证方式 | 说明 |
|------|----------|------|
| `/api/shop/*` | 无（公开） | 前台商品浏览、搜索、详情 |
| `/api/user/register` | 无 | 前台用户注册 |
| `/api/user/login` | 无 | 前台用户登录（邮箱/手机号 + 密码） |
| `/api/user/auto-login` | cookie_token | 前台自动登录 |
| `/api/user/admin-setup` | 无 | 首次管理员创建 |
| `/api/user/admin-setup/check` | 无 | 检查是否已有管理员 |
| `/api/user/admin-login` | 无 | 管理员登录（用户名 + 密码） |
| `/api/user/list` | JWT (admin) | 用户列表 |
| `/api/user/*` | JWT (admin) | 用户 CRUD |
| `/api/products/*` | JWT (admin) | 商品 CRUD |
| `/api/categories/*` | GET 公开，写 JWT (admin) | 分类管理 |
| `/api/orders/*` | 混合 | 前台 cookie_token / 后台 JWT (admin) |
| `/api/cart/*` | cookie_token | 购物车 |
| `/api/address/*` | cookie_token | 收货地址 |
| `/api/coupons/*` | 混合 | 优惠券领取与管理 |
| `/api/brands/*` | JWT (admin) | 品牌管理 |
| `/api/tags` | 无（公开） | 标签查询 |
| `/api/analytics/*` | JWT (admin) | 数据统计与埋点 |

---

## License

MIT
