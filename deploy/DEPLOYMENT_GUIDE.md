# 部署指南

本指南涵盖从开发到生产的完整部署流程，支持自托管Linux服务器与阿里云ECS。

## 部署目标

### 开发环境
- 本地开发机（Windows/Mac/Linux）
- 快速迭代与调试
- 无HTTPS要求

### 生产环境
- Linux服务器（CentOS/Ubuntu）
- 高可用与安全
- 完整的监控与备份

## 方案选择

### 方案A：本地Docker（最简单）

适用场景：快速评估、演示

```bash
cd deploy
docker compose up --build
```

⏱ 部署时间：< 5分钟
💾 资源占用：< 2GB
🔒 安全性：不支持远程访问

### 方案B：Linux服务器（推荐）

适用场景：长期运营、支持远程访问

```bash
cd deploy
chmod +x deploy.sh
./deploy.sh yourdomain.com
```

⏱ 部署时间：10-20分钟
💾 资源占用：1-4GB（可扩展）
🔒 安全性：完整HTTPS + 防火墙

### 方案C：阿里云ECS（企业级）

适用场景：公网访问、需要弹性扩展

详见 [ALIYUN_DEPLOYMENT.md](ALIYUN_DEPLOYMENT.md)

⏱ 部署时间：30-60分钟
💾 资源占用：按需配置
🔒 安全性：企业级安全组 + CDN

## 方案A 详细步骤：Docker本地部署

### 前置条件

- Docker & Docker Compose 已安装
- 至少2GB可用存储

### 快速启动

```bash
cd deploy
docker compose up --build
```

首次运行会自动：
1. 下载基础镜像
2. 构建后端与前端镜像
3. 初始化PostgreSQL数据库
4. 创建默认管理员账号

### 访问应用

- 前端：http://localhost:5173
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

### 停止服务

```bash
docker compose down
```

### 清空数据并重新开始

```bash
docker compose down -v
docker compose up --build
```

## 方案B 详细步骤：Linux自托管部署

### 1. 服务器准备

#### 系统要求

- CentOS 7+ 或 Ubuntu 20.04+
- 2vCPU + 4GB RAM + 20GB磁盘
- 公网IP（可选）

#### 基础环境配置

```bash
# CentOS
sudo yum update -y
sudo yum install -y python3 python3-pip nodejs git curl nginx supervisor

# Ubuntu
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl nginx supervisor
```

### 2. 创建应用用户

```bash
sudo useradd -m -s /bin/bash qsl
sudo mkdir -p /opt/qsl-tracker/{logs,backups,data}
sudo chown -R qsl:qsl /opt/qsl-tracker
```

### 3. 安装后端

```bash
cd /opt/qsl-tracker
sudo -u qsl git clone <your-repo> backend
cd backend

# 创建虚拟环境
sudo -u qsl python3 -m venv venv
sudo -u qsl bash -c 'source venv/bin/activate && pip install -r requirements.txt'

# 配置环境变量
sudo -u qsl cp .env.example .env
sudo -u qsl nano .env  # 编辑并设置强密码
```

配置 `.env` 关键字段：

```bash
SECRET_KEY=your-random-secret-key-here
ADMIN_PASSWORD=YourStrongPassword123!
CORS_ORIGINS=https://yourdomain.com
```

### 4. 安装前端

```bash
cd /opt/qsl-tracker
sudo -u qsl git clone <your-repo> frontend
cd frontend
sudo -u qsl npm install
sudo -u qsl VITE_API_BASE=https://yourdomain.com/api/v1 npm run build
```

### 5. 配置Supervisor（后台进程管理）

复制配置文件：

```bash
sudo cp /opt/qsl-tracker/deploy/supervisor_backend.conf /etc/supervisor/conf.d/qsl-backend.conf
```

编辑并启动：

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

验证状态：

```bash
sudo supervisorctl status
```

### 6. 配置Nginx（反向代理）

#### 前端配置

复制配置：

```bash
sudo cp /opt/qsl-tracker/deploy/nginx_frontend.conf /etc/nginx/sites-available/qsl-frontend
```

编辑域名：

```bash
sudo sed -i 's/yourdomain.com/your.actual.domain/g' /etc/nginx/sites-available/qsl-frontend
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/qsl-frontend /etc/nginx/sites-enabled/
```

#### API配置

```bash
sudo cp /opt/qsl-tracker/deploy/nginx_api.conf /etc/nginx/sites-available/qsl-api
sudo sed -i 's/api.yourdomain.com/api.your.domain/g' /etc/nginx/sites-available/qsl-api
sudo ln -s /etc/nginx/sites-available/qsl-api /etc/nginx/sites-enabled/
```

测试与重启：

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL证书安装

#### Let's Encrypt（自动续期）

```bash
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo certbot certonly --standalone -d api.yourdomain.com

# 配置自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

获得的证书路径：
- `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

在Nginx配置中引用：

```bash
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

#### 阿里云或其他商业证书

1. 从证书提供商下载Nginx格式证书
2. 上传到服务器：

```bash
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo cp yourdomain.crt /etc/ssl/certs/
sudo cp yourdomain.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/yourdomain.key
```

3. 在Nginx配置中引用

### 8. 防火墙配置

```bash
# CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 9. 备份与监控

#### 定时备份

创建 `/opt/qsl-tracker/backup.sh`：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/qsl-tracker/backups"
sqlite3 /opt/qsl-tracker/backend/qsl.db ".backup $BACKUP_DIR/qsl_$DATE.db"
gzip "$BACKUP_DIR/qsl_$DATE.db"
find "$BACKUP_DIR" -name "qsl_*.db.gz" -mtime +30 -delete
```

配置定时任务：

```bash
echo "0 2 * * * /opt/qsl-tracker/backup.sh" | sudo tee -a /var/spool/cron/crontabs/qsl
```

#### 日志监控

查看日志：

```bash
# 后端日志
sudo tail -f /opt/qsl-tracker/logs/backend.log

# Nginx日志
sudo tail -f /var/log/nginx/qsl_frontend_access.log
sudo tail -f /var/log/nginx/qsl_api_access.log
```

## 常见问题

### 503 Service Unavailable

**原因**：后端服务未启动或崩溃

**解决**：

```bash
sudo supervisorctl status qsl-backend
sudo supervisorctl restart qsl-backend
sudo tail -f /opt/qsl-tracker/logs/backend.error.log
```

### CORS错误

**原因**：前端域名不在后端白名单中

**解决**：更新 `.env` 中的 `CORS_ORIGINS`：

```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
sudo supervisorctl restart qsl-backend
```

### 性能缓慢

**原因**：

1. 后端资源不足
2. 数据库查询效率低
3. Nginx配置不当

**排查**：

```bash
# 检查系统资源
top
free -m
df -h

# 检查后端进程数
ps aux | grep uvicorn

# 增加后端进程数（编辑supervisor配置）
sudo supervisorctl restart qsl-backend
```

## 升级部署

### 从v0.1.0升级到v0.2.0

```bash
cd /opt/qsl-tracker/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt

# 若有数据库迁移
# alembic upgrade head

sudo supervisorctl restart qsl-backend
```

## 卸载

```bash
# 停止服务
sudo supervisorctl stop all
sudo systemctl stop nginx

# 删除应用目录
sudo rm -rf /opt/qsl-tracker

# 删除用户
sudo userdel -r qsl

# 清理Supervisor配置
sudo rm /etc/supervisor/conf.d/qsl-*.conf
sudo supervisorctl reread
sudo supervisorctl update
```

## 高级配置

### 启用Redis缓存

```bash
# 安装Redis
sudo apt install -y redis-server

# 在后端配置
# (后续版本支持)
```

### 配置CDN加速前端

```bash
# 在Nginx中配置缓存头
add_header Cache-Control "public, max-age=3600";
```

### 启用WAF（Web应用防火墙）

- 阿里云用户：购买WAF产品
- 自托管：使用ModSecurity + Nginx

## 测试清单

- [ ] 访问前端页面（http/https）
- [ ] 管理员登录成功
- [ ] 首次登录强制改密
- [ ] 新增QSL记录
- [ ] 按呼号查询
- [ ] 分页与排序功能
- [ ] 更新记录状态
- [ ] 编辑扩展属性
- [ ] 退出登录
- [ ] API文档可访问（/docs）
- [ ] 日志正常记录
- [ ] HTTPS证书有效

## 支持的部署环境

| 环境 | 操作系统 | 数据库 | 负载均衡 | 部署时间 |
|------|--------|--------|---------|---------|
| 本地开发 | Windows/Mac/Linux | SQLite | 否 | < 5分钟 |
| 单服务器 | CentOS 7+/Ubuntu 20+ | SQLite/PostgreSQL | Nginx | 10-20分钟 |
| 云服务器 | CentOS 7+/Ubuntu 20+ | RDS PostgreSQL | ALB | 30-60分钟 |
| Kubernetes | K8s 1.20+ | PostgreSQL | Ingress | 自定义 |

---

需要帮助？查看 [ALIYUN_DEPLOYMENT.md](ALIYUN_DEPLOYMENT.md) 获得阿里云特定指导。
