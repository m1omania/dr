#!/bin/bash

# Скрипт деплоя на Jino.ru VPS
# Использование: ./deploy-jino.sh user@your-server-ip [ssh-port] [ssh-password]
# Пример: ./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376 jinopass777
# Или: SSH_PASSWORD=jinopass777 ./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376

set -e

if [ -z "$1" ]; then
    echo "❌ Ошибка: укажите пользователя и IP сервера"
    echo "Использование: ./deploy-jino.sh user@your-server-ip [ssh-port] [ssh-password]"
    echo "Пример: ./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376 jinopass777"
    echo "Или: SSH_PASSWORD=jinopass777 ./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376"
    exit 1
fi

SERVER=$1
SSH_PORT=${2:-22}
SSH_PASSWORD=${SSH_PASSWORD:-${3:-}}
SSH_OPTS="-p $SSH_PORT"
APP_DIR="/opt/ux-audit"
SERVICE_NAME="ux-audit-backend"

# Проверяем наличие sshpass, если нужен пароль
if [ -n "$SSH_PASSWORD" ]; then
    if ! command -v sshpass &> /dev/null; then
        echo "❌ sshpass не установлен. Установите: brew install hudochenkov/sshpass/sshpass"
        exit 1
    fi
    SSH_CMD="sshpass -p '$SSH_PASSWORD' ssh"
else
    SSH_CMD="ssh"
fi

echo "🚀 Начинаю деплой на Jino.ru VPS..."
echo "   Сервер: $SERVER"
echo "   Директория приложения: $APP_DIR"

# Проверяем подключение к серверу
echo ""
echo "📡 Проверяю подключение к серверу (порт $SSH_PORT)..."
$SSH_CMD $SSH_OPTS -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new $SERVER "echo '✅ Подключение успешно'" || {
    echo "❌ Не удалось подключиться к серверу"
    echo "   Проверьте:"
    echo "   - IP адрес сервера"
    echo "   - SSH порт ($SSH_PORT)"
    echo "   - SSH пароль (если используется)"
    exit 1
}

# Устанавливаем необходимые пакеты на сервере
echo ""
echo "📦 Устанавливаю необходимые пакеты..."
$SSH_CMD $SSH_OPTS $SERVER << 'ENDSSH'
    set -e
    
    # Обновляем систему
    sudo apt-get update
    
    # Устанавливаем Node.js 20.x (LTS)
    if ! command -v node &> /dev/null; then
        echo "📥 Устанавливаю Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "✅ Node.js уже установлен: $(node --version)"
    fi
    
    # Устанавливаем зависимости для Puppeteer
    echo "📥 Устанавливаю зависимости для Puppeteer..."
    sudo apt-get install -y \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        lsb-release \
        wget \
        xdg-utils
    
    # Устанавливаем Git, если не установлен
    if ! command -v git &> /dev/null; then
        echo "📥 Устанавливаю Git..."
        sudo apt-get install -y git
    else
        echo "✅ Git уже установлен: $(git --version)"
    fi
    
    # Устанавливаем PM2 для управления процессами (опционально, можно использовать systemd)
    if ! command -v pm2 &> /dev/null; then
        echo "📥 Устанавливаю PM2..."
        sudo npm install -g pm2
    else
        echo "✅ PM2 уже установлен"
    fi
    
    echo "✅ Все пакеты установлены"
ENDSSH

# Создаем директорию приложения
echo ""
echo "📁 Создаю директорию приложения..."
$SSH_CMD $SSH_OPTS $SERVER "sudo mkdir -p $APP_DIR && sudo chown -R \$(whoami):\$(whoami) $APP_DIR"

# Клонируем или обновляем репозиторий
echo ""
echo "📥 Клонирую/обновляю репозиторий..."
$SSH_CMD $SSH_OPTS $SERVER << ENDSSH
    set -e
    cd $APP_DIR
    
    if [ -d ".git" ]; then
        echo "🔄 Обновляю репозиторий..."
        git pull origin main || git pull origin master
    else
        echo "📥 Клонирую репозиторий..."
        # Замените на URL вашего репозитория
        git clone https://github.com/m1omania/dr.git .
    fi
ENDSSH

# Устанавливаем зависимости и собираем проект
echo ""
echo "🔨 Устанавливаю зависимости и собираю проект..."
$SSH_CMD $SSH_OPTS $SERVER << ENDSSH
    set -e
    cd $APP_DIR/backend
    
    echo "📦 Устанавливаю npm зависимости..."
    npm install
    
    echo "🔨 Собираю TypeScript..."
    npm run build
    
    echo "✅ Сборка завершена"
ENDSSH

# Устанавливаем Chrome через Puppeteer
echo ""
echo "🌐 Устанавливаю Chrome через Puppeteer..."
$SSH_CMD $SSH_OPTS $SERVER << ENDSSH
    set -e
    cd $APP_DIR/backend
    
    echo "📥 Устанавливаю Chrome..."
    PUPPETEER_SKIP_DOWNLOAD=false npx puppeteer browsers install chrome
    
    echo "✅ Chrome установлен"
ENDSSH

# Создаем файл .env, если его нет
echo ""
echo "⚙️  Настраиваю переменные окружения..."
$SSH_CMD $SSH_OPTS $SERVER << 'ENDSSH'
    set -e
    cd $APP_DIR/backend
    
    if [ ! -f .env ]; then
        echo "📝 Создаю файл .env..."
        cat > .env << EOF
NODE_ENV=production
PORT=4001
DATABASE_PATH=$APP_DIR/database.sqlite
CORS_ORIGIN=https://your-frontend.vercel.app
# Добавьте ваши API ключи:
# HUGGINGFACE_API_KEY=hf_...
# OPENAI_API_KEY=sk-...
EOF
        echo "✅ Файл .env создан"
        echo "⚠️  ВАЖНО: Отредактируйте .env и добавьте ваши API ключи!"
    else
        echo "✅ Файл .env уже существует"
    fi
ENDSSH

# Создаем systemd service
echo ""
echo "🔧 Создаю systemd service..."
$SSH_CMD $SSH_OPTS $SERVER << ENDSSH
    set -e
    
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=UX Audit Backend Service
After=network.target

[Service]
Type=simple
User=\$(whoami)
WorkingDirectory=$APP_DIR/backend
Environment="NODE_ENV=production"
Environment="PORT=4001"
ExecStart=/usr/bin/node dist/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}
    echo "✅ Systemd service создан и включен"
ENDSSH

# Запускаем сервис
echo ""
echo "🚀 Запускаю сервис..."
$SSH_CMD $SSH_OPTS $SERVER "sudo systemctl restart ${SERVICE_NAME} && sleep 2 && sudo systemctl status ${SERVICE_NAME} --no-pager"

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Отредактируйте .env файл на сервере:"
echo "      $SSH_CMD $SSH_OPTS $SERVER 'nano $APP_DIR/backend/.env'"
echo ""
echo "   2. Добавьте ваши API ключи (HUGGINGFACE_API_KEY или OPENAI_API_KEY)"
echo ""
echo "   3. Перезапустите сервис:"
echo "      $SSH_CMD $SSH_OPTS $SERVER 'sudo systemctl restart ${SERVICE_NAME}'"
echo ""
echo "   4. Проверьте статус:"
echo "      $SSH_CMD $SSH_OPTS $SERVER 'sudo systemctl status ${SERVICE_NAME}'"
echo ""
echo "   5. Проверьте логи:"
echo "      $SSH_CMD $SSH_OPTS $SERVER 'sudo journalctl -u ${SERVICE_NAME} -f'"
echo ""
echo "   6. Настройте Nginx как reverse proxy (опционально, см. deploy-jino-nginx.sh)"
echo ""

