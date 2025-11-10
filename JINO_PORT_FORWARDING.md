# Настройка перенаправления портов на Jino.ru VPS

## Решение проблемы 503 через панель управления Jino.ru

### Проблема
Backend работает на порту 4001, но он может быть недоступен извне или Vercel блокирует HTTP запросы к нестандартным портам.

### Решение: Использовать проксирование портов 80/443

Jino.ru предоставляет панель управления для проксирования портов 80 и 443 на внутренний порт вашего сервера.

## Вариант 1: Прямое проксирование на backend (быстро, но не рекомендуется)

1. В панели управления Jino.ru:
   - Найдите раздел "Проксирование портов 80/443"
   - В поле "Порт по умолчанию" укажите: `4001`
   - Нажмите "Сохранить"

2. Теперь backend будет доступен через стандартные порты:
   - `http://53893873b619.vps.myjino.ru` (порт 80)
   - `https://53893873b619.vps.myjino.ru` (порт 443, если настроен SSL)

3. Обновите переменную окружения на Vercel:
   - Name: `API_URL`
   - Value: `http://53893873b619.vps.myjino.ru`

**⚠️ Не рекомендуется для production**, так как backend будет напрямую доступен без reverse proxy.

## Вариант 2: Через Nginx (рекомендуется)

### Шаг 1: Настроить Nginx на порту 80

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru

# Установить Nginx (если не установлен)
sudo apt-get update
sudo apt-get install -y nginx

# Создать конфигурацию
sudo tee /etc/nginx/sites-available/ux-audit-backend > /dev/null << 'EOF'
server {
    listen 80;
    server_name 53893873b619.vps.myjino.ru;

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
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4001/health;
        access_log off;
    }
}
EOF

# Активировать конфигурацию
sudo ln -sf /etc/nginx/sites-available/ux-audit-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Шаг 2: Настроить проксирование в панели Jino.ru

1. В панели управления Jino.ru:
   - Найдите раздел "Проксирование портов 80/443"
   - В поле "Порт по умолчанию" укажите: `80` (порт Nginx)
   - Нажмите "Сохранить"

2. Теперь Nginx будет доступен через стандартные порты:
   - `http://53893873b619.vps.myjino.ru` (порт 80 → Nginx → backend:4001)

### Шаг 3: Установить SSL (опционально, но рекомендуется)

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru

# Установить Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Получить SSL сертификат (если есть домен)
sudo certbot --nginx -d your-domain.com

# Или для IP адреса (если нет домена)
# Certbot не работает с IP, нужно использовать другой метод
```

### Шаг 4: Обновить переменную окружения на Vercel

- Name: `API_URL`
- Value: `http://53893873b619.vps.myjino.ru` (или `https://` если настроен SSL)

## Проверка работы

```bash
# Проверить доступность через порт 80
curl http://53893873b619.vps.myjino.ru/health

# Проверить работу API
curl -X POST http://53893873b619.vps.myjino.ru/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Преимущества этого подхода

1. ✅ Backend доступен через стандартные порты (80/443)
2. ✅ Vercel может подключаться без проблем
3. ✅ Можно настроить SSL для HTTPS
4. ✅ Nginx обеспечивает дополнительную защиту и гибкость
5. ✅ Можно настроить rate limiting, caching и т.д.

## Важно

- После настройки проксирования в панели Jino.ru, порт 4001 может быть недоступен напрямую извне
- Все запросы должны идти через порты 80/443
- Backend должен слушать на `0.0.0.0:4001` (не localhost)

