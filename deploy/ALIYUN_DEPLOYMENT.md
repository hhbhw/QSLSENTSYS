# QSL记录系统 阿里云部署方案

本文档涵盖在阿里云ECS上将系统从开发环境升级到生产环境的完整流程。

## 架构设计

```
┌─────────────────────────────────┐
│      用户浏览器              │
└──────────────┬──────────────────┘
               │
        ┌──────▼──────┐
        │ 阿里云WAF   │（可选安全防护）
        └──────┬──────┘
               │
        ┌──────▼──────────────────┐
        │ Nginx 反向代理 (443/80) │
        └──────┬──────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼──────┐    ┌───▼──────┐
   │ 前端应用 │    │ 后端API  │
   │Nginx+Dist│    │FastAPI   │
   └──────────┘    └───┬──────┘
                       │
                ┌──────▼──────────┐
                │ RDS PostgreSQL  │
                │（或本地数据库） │
                └─────────────────┘
```

## 前置条件

1. 阿里云账号与ECS实例（推荐CentOS 7.x 或 Ubuntu 20.04+）
2. 域名与备案（中国地区必需）
3. SSL证书（阿里云免费证书或自签名）
4. 二级域名用于API（例如 api.yourdomain.com）

## 步骤1：ECS环境准备

### 1.1 系统更新与依赖

```bash
# CentOS
sudo yum update -y
sudo yum install -y python3 python3-pip nodejs git curl wget nginx supervisor postgresql-devel

# Ubuntu
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl wget nginx supervisor postgresql-contrib
```

### 1.2 创建应用目录与用户

```bash
sudo useradd -m -s /bin/bash qsl
sudo mkdir -p /opt/qsl-tracker/{backend,frontend,logs}
sudo chown -R qsl:qsl /opt/qsl-tracker
```

### 1.3 配置Python虚拟环境

```bash
sudo -u qsl bash << 'EOF'
cd /opt/qsl-tracker
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
EOF
```

## 步骤2：阿里云RDS数据库配置（可选，生产推荐）

### 2.1 创建RDS实例

1. 登录阿里云控制台 → RDS数据库 → 创建实例
2. 选择PostgreSQL，设置：
   - 地域：与ECS相同
   - 版本：13.x 或更高
   - 存储空间：100GB（根据需求调整）
   - 账号名：qsl_admin
   - 密码：强密码（字母+数字+特殊字符）

### 2.2 配置安全组

在RDS安全组中添加规则：
- 协议：PostgreSQL
- 端口：5432
- 来源：ECS内网IP（CIDR）

### 2.3 获取连接字符串

```
postgresql://qsl_admin:PASSWORD@rm-xxx.pg.rds.aliyuncs.com:5432/qsl_db
```

## 步骤3：部署后端应用

### 3.1 克隆代码并配置环境

```bash
cd /opt/qsl-tracker
sudo -u qsl git clone <your-repo-url> backend
cd backend
```

### 3.2 生产环境配置

创建 `.env.production`：

```bash
APP_NAME=QSL Card Tracker API
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=postgresql://qsl_admin:PASSWORD@rm-xxx.pg.rds.aliyuncs.com:5432/qsl_db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_STRONG_PASSWORD
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3.3 安装依赖与初始化数据库

```bash
sudo -u qsl bash << 'EOF'
cd /opt/qsl-tracker/backend
source ../venv/bin/activate
pip install -r requirements.txt
# 如果需要数据库迁移（生产环境推荐）
# alembic upgrade head
EOF
```

### 3.4 配置Supervisor后台服务

创建 `/etc/supervisor/conf.d/qsl-backend.conf`：

```ini
[program:qsl-backend]
directory=/opt/qsl-tracker/backend
command=/opt/qsl-tracker/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
user=qsl
autostart=true
autorestart=true
stdout_logfile=/opt/qsl-tracker/logs/backend.log
stderr_logfile=/opt/qsl-tracker/logs/backend.error.log
environment=PATH="/opt/qsl-tracker/venv/bin"
```

启动服务：

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start qsl-backend
```

## 步骤4：部署前端应用

### 4.1 构建前端

```bash
cd /opt/qsl-tracker
sudo -u qsl bash << 'EOF'
git clone <your-repo-url> frontend
cd frontend
npm install
npm run build
EOF
```

### 4.2 配置前端环境

编辑 `frontend/.env.production`：

```
VITE_API_BASE=https://api.yourdomain.com/api/v1
```

重新构建：

```bash
cd /opt/qsl-tracker/frontend
npm run build
```

### 4.3 配置Nginx提供前端

创建 `/etc/nginx/sites-available/qsl-frontend`：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 重定向HTTP到HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }

    root /opt/qsl-tracker/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page 404 /index.html;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 步骤5：配置Nginx反向代理（后端API）

创建 `/etc/nginx/sites-available/qsl-api`：

```nginx
upstream qsl_backend {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/api.yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/api.yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://qsl_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /opt/qsl-tracker/logs/api_access.log;
    error_log /opt/qsl-tracker/logs/api_error.log;
}

# 重定向HTTP到HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/qsl-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/qsl-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 步骤6：SSL证书配置

### 6.1 使用阿里云免费证书

1. 登录阿里云控制台 → SSL证书
2. 申请免费证书（二级域名需分别申请）
3. 下载Nginx格式证书
4. 放置到 `/etc/ssl/certs/` 和 `/etc/ssl/private/`

### 6.2 或使用自签名证书（测试用）

```bash
# 生成私钥
openssl genrsa -out /etc/ssl/private/yourdomain.key 2048

# 生成自签名证书（365天有效期）
openssl req -new -x509 -key /etc/ssl/private/yourdomain.key \
  -out /etc/ssl/certs/yourdomain.crt -days 365 \
  -subj "/C=CN/ST=State/L=City/O=Org/CN=yourdomain.com"
```

## 步骤7：日志与监控

### 7.1 日志轮转

创建 `/etc/logrotate.d/qsl-tracker`：

```
/opt/qsl-tracker/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 qsl qsl
    sharedscripts
}
```

### 7.2 阿里云日志服务集成（可选）

```bash
# 安装阿里云日志代理
wget http://logtail-release-cn-hangzhou.oss-cn-hangzhou.aliyuncs.com/linux64/logtail.sh
chmod +x logtail.sh
./logtail.sh install cn_hangzhou
```

## 步骤8：数据备份策略

### 8.1 RDS自动备份

在RDS控制台设置：
- 备份周期：每天
- 备份保留期：7天
- 备份窗口：凌晨2-3点

### 8.2 本地数据库备份脚本

创建 `/opt/qsl-tracker/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/opt/qsl-tracker/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL备份
pg_dump -h rm-xxx.pg.rds.aliyuncs.com -U qsl_admin qsl_db | gzip > $BACKUP_DIR/qsl_db_$DATE.sql.gz

# 保留最近7天
find $BACKUP_DIR -name "qsl_db_*.sql.gz" -mtime +7 -delete
```

配置定时任务：

```bash
0 2 * * * /opt/qsl-tracker/backup.sh >> /opt/qsl-tracker/logs/backup.log 2>&1
```

## 步骤9：安全加固

### 9.1 配置安全组规则

在阿里云ECS安全组中：

| 规则方向 | 优先级 | 协议 | 端口 | 源 | 说明 |
|--------|-------|------|------|-----|------|
| 入方向 | 1 | TCP | 443 | 0.0.0.0/0 | HTTPS |
| 入方向 | 2 | TCP | 80 | 0.0.0.0/0 | HTTP（重定向） |
| 入方向 | 3 | TCP | 22 | 限定IP | SSH |

### 9.2 系统加固

```bash
# 禁用root远程登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 配置防火墙
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

## 步骤10：监控与告警

使用阿里云云监控：

1. 登录阿里云控制台 → 云监控
2. 创建报警规则：
   - CPU利用率 > 80%
   - 内存利用率 > 85%
   - 磁盘利用率 > 90%
3. 配置告警通知（邮件/短信）

## 步骤11：持续部署（可选）

### 11.1 配置GitLab CI/CD

创建 `.gitlab-ci.yml`：

```yaml
stages:
  - test
  - deploy

deploy_production:
  stage: deploy
  script:
    - ssh qsl@<ECS-IP> "cd /opt/qsl-tracker && git pull && npm run build"
    - ssh qsl@<ECS-IP> "sudo systemctl restart qsl-backend nginx"
  only:
    - main
```

## 常见问题排查

| 问题 | 症状 | 解决 |
|------|------|------|
| 前后端跨域 | 浏览器console报CORS错误 | 检查后端CORS_ORIGINS配置 |
| 数据库连接失败 | 502 Bad Gateway | 检查DATABASE_URL与RDS安全组 |
| SSL证书过期 | HTTPS报错 | 续期阿里云证书或更新自签名 |
| 性能下降 | 响应缓慢 | 检查RDS连接数、Nginx日志 |

## 性能优化建议

1. **后端**：
   - 开启Uvicorn多进程（workers >= CPU核数）
   - 配置Redis缓存高频查询
   - 为is_written、is_sent字段添加组合索引

2. **前端**：
   - 启用Gzip压缩（Nginx配置）
   - 使用CDN加速静态资源（可选）
   - 优化大表格的虚拟滚动

3. **数据库**：
   - 定期ANALYZE与VACUUM
   - 分区超大表格（10万+ 记录）
   - 启用PostgreSQL慢查询日志

## 总结

部署清单：
- [ ] ECS环境准备
- [ ] RDS创建与备份配置
- [ ] 后端应用部署与Supervisor配置
- [ ] 前端构建与Nginx配置
- [ ] SSL证书安装
- [ ] 日志与备份策略
- [ ] 安全加固
- [ ] 监控告警配置
- [ ] 文档与运维手册完善

