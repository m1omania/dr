# Деплой на Jino.ru VPS

Инструкция по деплою UX Audit Backend на VPS от Jino.ru.

## 📋 Требования

- VPS с Ubuntu 24.04 LTS (или другой Linux дистрибутив)
- Минимум: 2GB RAM, 1 CPU, 20GB SSD
- Рекомендуется: 4GB RAM, 2+ CPU, 40GB SSD
- SSH доступ к серверу
- Доменное имя (опционально, для SSL)

## 🚀 Быстрый старт

### 1. Подготовка

Убедитесь, что у вас есть:
- IP адрес сервера
- SSH доступ (логин/пароль или ключ)
- URL вашего репозитория (GitHub/GitLab)

### 2. Автоматический деплой

```bash
# Сделайте скрипт исполняемым
chmod +x deploy-jino.sh

# Запустите деплой (замените на ваши данные)
# Если используется кастомный SSH порт (например, 49376):
./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376

# Или если стандартный порт 22:
./deploy-jino.sh root@your-server-ip
```

Скрипт автоматически:
- ✅ Установит Node.js 20.x
- ✅ Установит зависимости для Puppeteer
- ✅ Установит Chrome через Puppeteer
- ✅ Склонирует/обновит репозиторий
- ✅ Установит npm зависимости
- ✅ Соберет TypeScript проект
- ✅ Создаст systemd service
- ✅ Запустит backend сервис

### 3. Настройка переменных окружения

После деплоя отредактируйте `.env` файл на сервере:

```bash
ssh root@your-server-ip
nano /opt/ux-audit/backend/.env
```

Добавьте ваши API ключи:

```env
NODE_ENV=production
PORT=4001
DATABASE_PATH=/opt/ux-audit/database.sqlite
CORS_ORIGIN=https://your-frontend.vercel.app

# Обязательно добавьте один из этих ключей:
HUGGINGFACE_API_KEY=hf_...
# или
OPENAI_API_KEY=sk-...
```

Перезапустите сервис:

```bash
sudo systemctl restart ux-audit-backend
```

### 4. Настройка Nginx (опционально, но рекомендуется)

```bash
# Сделайте скрипт исполняемым
chmod +x deploy-jino-nginx.sh

# Настройте Nginx (замените на ваши данные)
./deploy-jino-nginx.sh root@your-server-ip your-domain.com
```

### 5. Установка SSL (Let's Encrypt)

```bash
ssh root@your-server-ip

# Установите Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com

# Certbot автоматически настроит Nginx для HTTPS
```

## 🔧 Ручная настройка (если скрипт не работает)

### 1. Подключитесь к серверу

```bash
ssh root@your-server-ip
```

### 2. Установите Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Установите зависимости для Puppeteer

```bash
sudo apt-get update
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
```

### 4. Клонируйте репозиторий

```bash
cd /opt
sudo mkdir -p ux-audit
sudo chown -R $USER:$USER ux-audit
cd ux-audit
git clone https://github.com/your-username/your-repo.git .
```

### 5. Установите зависимости

```bash
cd backend
npm install
npm run build
```

### 6. Установите Chrome через Puppeteer

```bash
PUPPETEER_SKIP_DOWNLOAD=false npx puppeteer browsers install chrome
```

### 7. Создайте .env файл

```bash
nano .env
```

Добавьте:

```env
NODE_ENV=production
PORT=4001
DATABASE_PATH=/opt/ux-audit/database.sqlite
CORS_ORIGIN=https://your-frontend.vercel.app
HUGGINGFACE_API_KEY=hf_...
```

### 8. Создайте systemd service

```bash
sudo nano /etc/systemd/system/ux-audit-backend.service
```

Добавьте:

```ini
[Unit]
Description=UX Audit Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ux-audit/backend
Environment="NODE_ENV=production"
Environment="PORT=4001"
ExecStart=/usr/bin/node dist/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 9. Запустите сервис

```bash
sudo systemctl daemon-reload
sudo systemctl enable ux-audit-backend
sudo systemctl start ux-audit-backend
sudo systemctl status ux-audit-backend
```

## 📊 Управление сервисом

### Проверка статуса

```bash
sudo systemctl status ux-audit-backend
```

### Просмотр логов

```bash
# Все логи
sudo journalctl -u ux-audit-backend -f

# Последние 100 строк
sudo journalctl -u ux-audit-backend -n 100

# Логи за сегодня
sudo journalctl -u ux-audit-backend --since today
```

### Перезапуск

```bash
sudo systemctl restart ux-audit-backend
```

### Остановка

```bash
sudo systemctl stop ux-audit-backend
```

### Запуск

```bash
sudo systemctl start ux-audit-backend
```

## 🔍 Проверка работы

### Health check

```bash
# Локально на сервере
curl http://localhost:4001/health

# Через Nginx (если настроен)
curl http://your-domain.com/health
```

### Тестовый запрос

```bash
curl -X POST http://localhost:4001/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 🔄 Обновление приложения

### Автоматическое обновление

```bash
ssh root@your-server-ip
cd /opt/ux-audit
git pull origin main
cd backend
npm install
npm run build
sudo systemctl restart ux-audit-backend
```

### Или используйте скрипт

```bash
./deploy-jino.sh root@your-server-ip
```

## 🛠️ Устранение неполадок

### Сервис не запускается

```bash
# Проверьте логи
sudo journalctl -u ux-audit-backend -n 50

# Проверьте, что порт не занят
sudo netstat -tulpn | grep 4001

# Проверьте права доступа
ls -la /opt/ux-audit/backend
```

### Chrome не найден

```bash
# Проверьте, установлен ли Chrome
ls -la /opt/ux-audit/backend/.local-chromium

# Переустановите Chrome
cd /opt/ux-audit/backend
PUPPETEER_SKIP_DOWNLOAD=false npx puppeteer browsers install chrome
```

### Недостаточно памяти

Если у вас 2GB RAM и возникают проблемы с памятью:

1. Увеличьте swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. Или обновите тариф на VPS до 4GB RAM

### Проблемы с Nginx

```bash
# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx

# Проверьте логи
sudo tail -f /var/log/nginx/ux-audit-backend-error.log
```

## 📈 Мониторинг

### Использование ресурсов

```bash
# CPU и память
htop

# Диск
df -h

# Сетевые подключения
sudo netstat -tulpn
```

### Логи приложения

```bash
# В реальном времени
sudo journalctl -u ux-audit-backend -f
```

## 🔐 Безопасность

### Firewall (UFW)

```bash
# Установите UFW
sudo apt-get install -y ufw

# Разрешите SSH
sudo ufw allow 22/tcp

# Разрешите HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включите firewall
sudo ufw enable
```

### Обновление системы

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

## 📝 Примечания

- На VPS **не используется** `--single-process` флаг для Puppeteer (больше ресурсов)
- Chrome устанавливается через Puppeteer в `.local-chromium` директорию
- База данных SQLite хранится в `/opt/ux-audit/database.sqlite`
- Логи доступны через `journalctl` или в `/var/log/nginx/` (если используется Nginx)

## 🆚 Сравнение с Render

| Параметр | Render (Free) | Jino.ru VPS |
|----------|---------------|-------------|
| Холодный старт | 30-60 сек | Нет (всегда работает) |
| Скорость анализа | 10-20 сек | 5-15 сек |
| Ресурсы | 512MB RAM, 0.5 CPU | 2-4GB RAM, 1-4 CPU |
| Стоимость | Бесплатно | ~500-1500₽/мес |
| Настройка | Простая | Требует настройки |
| Масштабирование | Ограничено | Полный контроль |

## ✅ Готово!

Ваш backend должен работать на `http://your-server-ip:4001` или `https://your-domain.com` (если настроен Nginx + SSL).

Обновите `CORS_ORIGIN` в `.env` на URL вашего frontend на Vercel.

