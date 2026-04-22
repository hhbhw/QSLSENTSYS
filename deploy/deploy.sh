#!/bin/bash
set -e

# QSL 卡片记录系统 阿里云快速部署脚本

echo "=== QSL系统部署 ==="

# 参数
DOMAIN=${1:-yourdomain.com}
API_DOMAIN=${2:-api.$DOMAIN}
DB_URL=${3:-sqlite:///./qsl.db}
ADMIN_PWD=${4:-StrongPassword123!}

echo "配置："
echo "- 前端域名: $DOMAIN"
echo "- API域名: $API_DOMAIN"
echo "- 数据库: $DB_URL"

# 创建应用目录
sudo mkdir -p /opt/qsl-tracker/{logs,backups}
sudo chown -R $(whoami):$(whoami) /opt/qsl-tracker

# Python环境
cd /opt/qsl-tracker
python3 -m venv venv
source venv/bin/activate

# 后端
if [ ! -d "backend" ]; then
    git clone <your-repo> backend
fi
cd backend
pip install -r requirements.txt

cat > .env << EOF
APP_NAME=QSL Card Tracker
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
DATABASE_URL=$DB_URL
ADMIN_PASSWORD=$ADMIN_PWD
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
EOF

cd /opt/qsl-tracker

# 前端
if [ ! -d "frontend" ]; then
    git clone <your-repo> frontend
fi
cd frontend
npm install
VITE_API_BASE=https://$API_DOMAIN/api/v1 npm run build

echo "✓ 部署完成"
echo "后续步骤："
echo "1. 配置Nginx: sudo cp deploy/nginx_*.conf /etc/nginx/sites-available/"
echo "2. 安装SSL证书到 /etc/ssl/certs/ 和 /etc/ssl/private/"
echo "3. 启动服务: sudo systemctl restart nginx"
