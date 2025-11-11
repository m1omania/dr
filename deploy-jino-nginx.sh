#!/bin/bash

# Скрипт настройки Nginx как reverse proxy для Jino.ru VPS
# Использование: ./deploy-jino-nginx.sh user@your-server-ip your-domain.com [ssh-port]
# Пример: ./deploy-jino-nginx.sh root@53893873b619.vps.myjino.ru your-domain.com 49376

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Ошибка: укажите пользователя, IP сервера и домен"
    echo "Использование: ./deploy-jino-nginx.sh user@your-server-ip your-domain.com [ssh-port]"
    echo "Пример: ./deploy-jino-nginx.sh root@53893873b619.vps.myjino.ru your-domain.com 49376"
    exit 1
fi

SERVER=$1
DOMAIN=$2
SSH_PORT=${3:-22}
SSH_OPTS="-p $SSH_PORT"
BACKEND_PORT=4001

echo "🚀 Настраиваю Nginx как reverse proxy..."
echo "   Сервер: $SERVER"
echo "   Домен: $DOMAIN"
echo "   Backend порт: $BACKEND_PORT"

# Устанавливаем Nginx
echo ""
echo "📦 Устанавливаю Nginx..."
ssh $SSH_OPTS $SERVER << 'ENDSSH'
    set -e
    
    if ! command -v nginx &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nginx
    else
        echo "✅ Nginx уже установлен"
    fi
ENDSSH

# Создаем конфигурацию Nginx
echo ""
echo "⚙️  Создаю конфигурацию Nginx..."
ssh $SSH_OPTS $SERVER << ENDSSH
    set -e
    
    sudo tee /etc/nginx/sites-available/ux-audit-backend > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Логи
    access_log /var/log/nginx/ux-audit-backend-access.log;
    error_log /var/log/nginx/ux-audit-backend-error.log;

    # Увеличиваем размеры для больших запросов (скриншоты)
    client_max_body_size 10M;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # Проксируем запросы на backend
    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/health;
        access_log off;
    }
}
EOF

    # Активируем конфигурацию
    sudo ln -sf /etc/nginx/sites-available/ux-audit-backend /etc/nginx/sites-enabled/
    
    # Удаляем дефолтную конфигурацию, если она есть
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Проверяем конфигурацию
    sudo nginx -t
    
    echo "✅ Конфигурация Nginx создана"
ENDSSH

# Перезапускаем Nginx
echo ""
echo "🔄 Перезапускаю Nginx..."
ssh $SSH_OPTS $SERVER "sudo systemctl restart nginx && sudo systemctl status nginx --no-pager"

echo ""
echo "✅ Nginx настроен!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Настройте DNS записи для домена $DOMAIN:"
echo "      A запись: IP вашего сервера"
echo ""
echo "   2. Установите SSL сертификат (Let's Encrypt):"
echo "      ssh $SSH_OPTS $SERVER"
echo "      sudo apt-get install -y certbot python3-certbot-nginx"
echo "      sudo certbot --nginx -d $DOMAIN"
echo ""
echo "   3. Проверьте работу:"
echo "      curl http://$DOMAIN/health"
echo ""

