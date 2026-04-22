# QSL Card Tracker - QSL卡片发出记录系统

QSL 卡片发出记录系统是一个基于 FastAPI + React 的轻量级网页应用，用于管理业余无线电的QSL卡片收发记录。支持呼号录入、状态跟踪、自由扩展属性、分页查询与排序，可部署至自托管主机或阿里云ECS。

仓库地址已更新为：[https://github.com/hhbhw/QSLSENTSYS](https://github.com/hhbhw/QSLSENTSYS)

## 核心功能

- **账号登录与权限**：支持 `admin / editor / viewer` 三种角色
- **呼号管理**：新增、查询、编辑QSL记录
- **状态跟踪**：布尔字段记录"是否已写好"和"是否已发出"
- **卡片类型**：自定义卡片类型（直邮卡、贺卡等）
- **可扩展属性**：自由键值对扩展字段（频率、通信模式等）
- **高级查询**：按呼号模糊搜索、状态筛选、字段排序、分页浏览
- **网页表格**：动态列展示、快速状态切换、扩展属性编辑
- **公开查询页**：可匿名访问，只展示呼号与写好/发出状态

## 项目结构

```
qsl-managesys/
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── api/               # API路由
│   │   ├── core/              # 配置与安全
│   │   ├── db/                # 数据库会话
│   │   ├── models/            # ORM模型
│   │   ├── schemas/           # 请求/响应数据结构
│   │   ├── services/          # 业务逻辑
│   │   └── main.py            # FastAPI入口
│   ├── requirements.txt        # Python依赖
│   ├── .env.example           # 环境配置示例
│   ├── .env.production        # 生产环境配置示例
│   ├── Dockerfile             # 容器镜像
│   └── README.md              # 后端说明
├── frontend/                  # React + Vite 前端
│   ├── src/
│   │   ├── api/               # API客户端
│   │   ├── components/        # React组件
│   │   ├── pages/             # 页面容器
│   │   ├── App.jsx            # 主应用
│   │   ├── main.jsx           # 入口
│   │   └── styles.css         # 样式表
│   ├── package.json           # npm依赖
│   ├── vite.config.js         # Vite配置
│   ├── index.html             # HTML模板
│   ├── Dockerfile             # 容器镜像
│   └── README.md              # 前端说明
├── deploy/                    # 部署文件
│   ├── docker-compose.yml     # 开发环境编排
│   ├── docker-compose.production.yml  # 生产环境编排
│   ├── nginx_frontend.conf    # 前端Nginx配置
│   ├── nginx_api.conf         # API反向代理配置
│   ├── supervisor_backend.conf # 后端进程管理配置
│   ├── deploy.sh              # 自动部署脚本
│   ├── ALIYUN_DEPLOYMENT.md   # 阿里云部署指南
│   └── DEPLOYMENT_GUIDE.md    # 通用部署指南
├── README.md                  # 本文件
└── generator                  # 项目占位文件

```

## 快速开始

### 本地开发（Windows/Mac/Linux）

#### 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 API 文档：http://localhost:8000/docs

#### 前端

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

访问应用：http://localhost:5173

**默认登录凭证**（来自 `.env`）
- 用户名: `ADMIN_USERNAME`
- 密码: `ADMIN_PASSWORD`

### Docker本地运行

```bash
cd deploy
docker compose up --build
```

应用地址：http://localhost:5173

### 生产部署

详见 [ALIYUN_DEPLOYMENT.md](deploy/ALIYUN_DEPLOYMENT.md) 获得完整阿里云ECS部署步骤。

快速部署（需提前配置服务器环境）：

```bash
cd deploy
chmod +x deploy.sh
./deploy.sh yourdomain.com api.yourdomain.com "postgresql://..." "StrongPassword"
```

## 公开查询页嵌入

公开查询页地址：

```text
https://你的前端域名/public-query
```

如果你的个人主页需要通过 iframe 嵌入，可以直接使用下面的方式：

```html
<iframe
	src="https://你的前端域名/public-query"
	width="100%"
	height="420"
	frameborder="0"
	style="border:0"
></iframe>
```

如果要带查询参数，也可以这样写：

```html
<iframe
	src="https://你的前端域名/public-query?callsign=BG1ABC"
	width="100%"
	height="420"
	frameborder="0"
	style="border:0"
></iframe>
```

注意：生产环境需要在前端反代或 Nginx 中允许 iframe 嵌入；仓库中的前端 Nginx 配置已经按这个方向调整。

## 核心API

| 端点 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/v1/health` | GET | 健康检查 | 否 |
| `/api/v1/auth/login` | POST | 账号登录 | 否 |
| `/api/v1/auth/change-password` | POST | 修改密码 | 是 |
| `/api/v1/records` | POST | 新增记录 | 是 |
| `/api/v1/records` | GET | 查询记录（含分页、筛选、排序） | 是 |
| `/api/v1/records/{id}` | PATCH | 更新记录 | 是 |

### 查询参数示例

```
GET /api/v1/records?callsign=BG1&is_written=true&is_sent=false&sort_by=created_at&sort_order=desc&page=1&page_size=20
```

## 数据库

### 表结构

**qsl_records** - QSL记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| callsign | String(32) | 呼号（唯一） |
| card_type | String(128) | 卡片类型 |
| is_written | Boolean | 是否已写好 |
| is_sent | Boolean | 是否已发出 |
| extra_attributes | JSON | 扩展属性（键值对） |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 最后更新时间 |

**admin_users** - 管理员表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| username | String(64) | 用户名（唯一） |
| hashed_password | String(255) | 密码哈希 |
| password_changed | Boolean | 是否已改密 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 最后更新时间 |

### 支持的数据库

- **SQLite**（开发，默认）
- **PostgreSQL**（生产推荐）

切换数据库：更改 `.env` 中的 `DATABASE_URL`

```
# SQLite
DATABASE_URL=sqlite:///./qsl.db

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/qsl_db
```

## 功能特性

### 2024年4月21日发布（v0.1.0）

- ✅ 基础登录与认证（Bearer Token）
- ✅ 呼号增查改（CRUD）
- ✅ 固定属性：是否写好、是否发出、卡片类型
- ✅ 可扩展属性：自由JSON字段
- ✅ 分页查询（默认20条/页）
- ✅ 多字段排序（呼号、创建时间、更新时间）
- ✅ 状态筛选（已写好、已发出）
- ✅ 网页表格呈现（动态列展示）
- ✅ 首次登录强制改密
- ✅ Docker容器化
- ✅ 阿里云ECS部署方案

### 规划中（v0.2.0+）

- ✅ 公开查询页（iframe 嵌入）
- ⬜ 批量导入/导出（CSV/Excel）
- ⬜ 数据备份与恢复
- ⬜ 操作日志审计
- ⬜ 多用户与角色权限
- ⬜ 报表与统计分析
- ⬜ 移动端适配优化

## 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_NAME` | QSL Card Tracker API | 应用名称 |
| `SECRET_KEY` | 无 | JWT加密密钥（必须设置） |
| `DATABASE_URL` | sqlite:///./qsl.db | 数据库URL |
| `ADMIN_USERNAME` | change_me_admin | 默认管理员用户名（请在本地 .env 覆盖） |
| `ADMIN_PASSWORD` | ChangeMe123! | 默认管理员密码 |
| `CORS_ORIGINS` | http://localhost:5173 | 跨域白名单 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 720 | token过期时间（分钟） |

## 安全建议

- 生产环境必须使用 HTTPS
- 定期修改管理员密码
- 启用数据库备份与恢复
- 配置安全组限制API访问源IP
- 启用请求限流防止滥用
- 定期更新依赖包版本

## 性能指标

测试环境：SQLite + 20000条记录

| 操作 | 响应时间 |
|------|---------|
| 单条新增 | < 50ms |
| 分页查询 | < 100ms |
| 全字段更新 | < 60ms |
| 大表扫描（无索引） | ~500ms |

生产环境使用PostgreSQL与适当索引可获得10倍以上性能提升。

## 故障排查

### 登录失败

检查 `.env` 中 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 是否正确设置。

### 跨域错误

确保 `CORS_ORIGINS` 包含前端访问域名：

```
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### 数据库连接失败

- 检查 `DATABASE_URL` 格式
- 确保数据库服务可访问
- 查看后端日志获取具体错误

### 前端页面空白

检查浏览器控制台（F12）是否有JavaScript错误或API连接失败。

## 贡献指南

欢迎提交Issue与PR。主要开发分支为 `main`。

## 许可证

MIT License

## 联系与支持

如有问题，请创建Issue或通过以下方式联系：
- GitHub Issues
- 邮件：bi4avz@gmail.com


---

**版本历史**

- v0.1.0 (2026-04-21): 初版发布，包含核心功能与阿里云部署方案

