#!/bin/bash
set -e

echo "=========================================================="
echo " Starting Automated Deployment for Proefficient Backend    "
echo "=========================================================="

DB_NAME="proefficient_institute"
DB_USER="proefficient_user"
DB_PASS="Proefficient@2026!"
APP_DIR="/var/www/proefficient-backend"

# 1. Update and install packages
echo "[1/8] Installing required packages (Nginx, Unzip, PM2)..."
sudo apt update -y
sudo apt install -y nginx unzip curl
sudo npm install -g pm2

# 2. Start MySQL
echo "[2/8] Setting up MySQL..."
sudo systemctl start mysql
sudo systemctl enable mysql

# Create Database and User
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';" 2>/dev/null || \
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 3. Extract backend files
echo "[3/8] Extracting project files to ${APP_DIR}..."
sudo mkdir -p "${APP_DIR}"
if [ -f "/var/www/backend-deploy.zip" ]; then
    sudo unzip -o /var/www/backend-deploy.zip -d "${APP_DIR}"
fi
cd "${APP_DIR}"

# 4. Import initial database schema
if [ -f "${APP_DIR}/database.sql" ]; then
    echo "[4/8] Importing database tables and initial data..."
    mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${APP_DIR}/database.sql" || true
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
echo "[6/8] Installing dependencies and building TypeScript..."
npm install
npx prisma generate
npm run build
mkdir -p uploads
chmod -R 755 uploads

# 7. Start PM2
echo "[7/8] Starting backend with PM2..."
pm2 delete proefficient-backend 2>/dev/null || true
pm2 start dist/server.js --name "proefficient-backend"
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup

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
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable 2>/dev/null || true
fi

echo "=========================================================="
echo " Deployment Successfully Finished! "
echo " Your backend is live and listening on port 80: "
echo " http://201.18.193.228 "
echo "=========================================================="
