# 中华传统节日文化展示平台

基于 Node.js + Express + SQLite + JWT 鉴权的传统节日文化展示与管理系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 + CSS3 + 原生 JavaScript |
| 后端 | Node.js + Express 4 |
| 数据库 | SQLite (sql.js) |
| 鉴权 | JWT + bcryptjs |
| 文档 | Swagger (OpenAPI 3.0) |
| 文件上传 | Multer |

## 项目结构

```
├── public/                    # 前端静态资源
│   ├── index.html             # 首页（节日列表 + 搜索）
│   ├── detail.html            # 节日详情页
│   ├── login.html             # 管理后台登录
│   ├── admin.html             # 管理后台（含图片上传）
│   ├── css/
│   │   └── styles.css         # 全局样式
│   ├── js/
│   │   ├── main.js            # 首页逻辑（分页/搜索/骨架屏/懒加载）
│   │   ├── detail.js          # 详情页逻辑
│   │   ├── login.js           # 登录逻辑（JWT）
│   │   └── admin.js           # 管理后台逻辑（CRUD/上传/确认弹窗）
│   └── images/
│       ├── festivals/         # 节日图片
│       │   ├── 春节/  元宵节/  清明节/
│       │   ├── 端午节/ 七夕节/  中秋节/
│       │   ├── 重阳节/ 冬至/
│       └── uploads/           # 上传图片目录（自动创建）
├── db.js                      # 数据库模块（初始化、CRUD、鉴权）
├── server.js                  # Express 主服务
├── init-db.js                 # 独立数据库初始化脚本
├── data/                      # 数据目录（运行时自动创建）
│   └── festivals.db           # SQLite 数据库文件
├── package.json
├── .env                       # 环境变量
├── .gitignore
├── Dockerfile
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0 < 21.0.0
- npm >= 8.0.0

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动服务（自动初始化数据库 + 种子数据）
npm start

# 开发模式（热重载）
npm run dev
```

服务启动后访问：

| 地址 | 说明 |
|------|------|
| http://localhost:3000 | 首页 |
| http://localhost:3000/detail.html?id=1 | 节日详情 |
| http://localhost:3000/login.html | 管理后台登录 |
| http://localhost:3000/admin.html | 管理后台 |
| http://localhost:3000/api-docs | API 文档 (Swagger) |

**默认管理员账号**：首次启动自动创建，用户名默认 `furina`，密码由 `.env` 的 `ADMIN_PASSWORD` 决定；未设置时随机生成并在启动控制台打印一次（生产环境请务必设置）

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/festivals` | 分页获取节日列表（支持 ?keyword= 搜索） |
| GET | `/api/festivals/all` | 获取全部节日（不分页） |
| GET | `/api/festivals/:id` | 获取节日详情 |

### 管理后台接口（需 JWT 鉴权）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/verify` | 验证 token |
| GET | `/api/admin/festivals` | 获取全部节日 |
| POST | `/api/admin/festivals` | 添加节日 |
| PUT | `/api/admin/festivals/:id` | 更新节日 |
| DELETE | `/api/admin/festivals/:id` | 删除节日 |
| POST | `/api/admin/upload` | 上传单张图片 |
| POST | `/api/admin/upload-multi` | 批量上传图片 |
| GET | `/api/admin/stats` | 获取统计数据 |

## 数据库设计

### ER 模型

```
festivals (1) ──── (N) customs
festivals (1) ──── (N) activities
festivals (1) ──── (N) images
users (独立鉴权表)
```

### 表结构

**festivals** — 节日主表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 节日名称 |
| date | TEXT | 节日日期 |
| description | TEXT | 节日描述 |
| cover_image | TEXT | 封面图 |
| created_at | DATETIME | 创建时间 |

**customs / activities / images** — 关联表（外键 CASCADE 删除）

**users** — 管理员表（bcrypt 加密存储）

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3000 | 服务端口 |
| JWT_SECRET | (内置默认值) | JWT 签名密钥 |
| JWT_EXPIRES | 24h | Token 过期时间 |

## Docker 部署

```bash
docker build -t traditional-festivals .
docker run -p 3000:3000 traditional-festivals
```

## 功能特性

### 前台
- 节日列表分页展示 + 关键词搜索
- 图片懒加载
- 骨架屏加载效果
- 响应式布局（移动端适配）

### 管理后台
- JWT 安全鉴权
- 节日增删改查
- 图片上传与管理
- 表单校验
- 操作二次确认弹窗
- 管理后台节日搜索
