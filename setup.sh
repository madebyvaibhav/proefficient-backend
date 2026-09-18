#!/bin/bash
set -e

echo "=========================================================="
echo " 🚀 Starting Automated Deployment for Proefficient Backend "
echo "=========================================================="

DB_NAME="proefficient_institute"
DB_USER="proefficient_user"
DB_PASS="Proefficient@2026!"
APP_DIR="/var/www/proefficient-backend"
REPO_URL="https://github.com/madebyvaibhav/proefficient-backend.git"

# Authorize deploy SSH key for automated future deploys
mkdir -p ~/.ssh && chmod 700 ~/.ssh
if ! grep -q "vps_deploy" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO1L0RQ7jfrHp2VVlC880zoJXh9STH5OkefaZ4NYkv4P vps_deploy" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

# 1. Update and install packages
echo "[1/8] Installing required system packages (Node.js, Git, Nginx, PM2)..."
sudo apt update -y
sudo apt install -y nginx git curl unzip build-essential

# Ensure Node.js 20 is installed if missing
if ! command -v node >/dev/null 2>&1; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Ensure PM2 is installed
if ! command -v pm2 >/dev/null 2>&1; then
    sudo npm install -g pm2
fi

# 2. Start and configure MySQL
echo "[2/8] Setting up MySQL..."
sudo systemctl start mysql || sudo service mysql start
sudo systemctl enable mysql || true

sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';" 2>/dev/null || \
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 3. Clone or pull repository
echo "[3/8] Getting backend source code from GitHub..."
if [ -d "${APP_DIR}/.git" ]; then
    echo "Repository already exists at ${APP_DIR}, pulling latest changes..."
    cd "${APP_DIR}"
    git pull origin master
else
    echo "Cloning repository from ${REPO_URL}..."
    sudo rm -rf "${APP_DIR}"
    sudo git clone "${REPO_URL}" "${APP_DIR}"
    cd "${APP_DIR}"
fi

# 4. Import initial database schema if tables are not present
if [ -f "${APP_DIR}/database.sql" ]; then
    echo "[4/8] Syncing database tables..."
    mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${APP_DIR}/database.sql" 2>/dev/null || true
fi

# 5. Setup production .env
echo "[5/8] Configuring .env file..."
cat << 'EOF' > "${APP_DIR}/.env"
DATABASE_URL="mysql://proefficient_user:Proefficient@2026!@127.0.0.1:3306/proefficient_institute"
JWT_SECRET="supersecret_jwt_key_12345"
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

GROQ_API_KEY=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
CEREBRAS_API_KEY=csk-xd4mpr328wjm2mtc5ppw8kd6y3jfy8ymkwvrcyt34jjxddhw
CEREBRAS_MODEL_ID=llama-3.3-70b
EOF

# 6. Build Project
echo "[6/8] Installing dependencies and building project..."
npm install
npx prisma generate
npx prisma db push
npm run build
mkdir -p uploads
chmod -R 755 uploads

# 7. Start PM2
echo "[7/8] Starting backend with PM2..."
pm2 delete proefficient-backend 2>/dev/null || true
pm2 start dist/src/server.js --name "proefficient-backend"
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup || true

# 8. Configure Nginx Reverse Proxy
echo "[8/8] Configuring Nginx Reverse Proxy..."
cat << 'EOF' > /etc/nginx/sites-available/proefficient
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/proefficient /etc/nginx/sites-enabled/proefficient
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Firewall settings
if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH 2>/dev/null || true
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
fi

echo "=========================================================="
echo " 🎉 BACKEND IS LIVE & RUNNING! "
echo " Public API URL: http://201.18.193.228 "
echo "=========================================================="
