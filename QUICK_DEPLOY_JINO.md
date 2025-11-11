# Быстрый деплой на Jino.ru VPS

## 🚀 Ваши данные сервера

- **SSH доступ:** `ssh -p 49376 root@53893873b619.vps.myjino.ru`
- **Порт SSH:** `49376`
- **Пользователь:** `root`
- **Хост:** `53893873b619.vps.myjino.ru`

## 📋 Быстрый старт

### 1. Запустите автоматический деплой

```bash
./deploy-jino.sh root@53893873b619.vps.myjino.ru 49376
```

Скрипт автоматически:
- ✅ Установит Node.js 20.x
- ✅ Установит зависимости для Puppeteer
- ✅ Установит Chrome через Puppeteer
- ✅ Склонирует репозиторий
- ✅ Установит npm зависимости
- ✅ Соберет TypeScript проект
- ✅ Создаст systemd service
- ✅ Запустит backend сервис

### 2. Настройте переменные окружения

После деплоя подключитесь к серверу:

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
```

Отредактируйте `.env` файл:

```bash
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

Сохраните файл (Ctrl+O, Enter, Ctrl+X) и перезапустите сервис:

```bash
sudo systemctl restart ux-audit-backend
```

### 3. Проверьте работу

```bash
# Проверьте статус
sudo systemctl status ux-audit-backend

# Проверьте health endpoint
curl http://localhost:4001/health

# Посмотрите логи
sudo journalctl -u ux-audit-backend -f
```

## 🔧 Полезные команды

### Подключение к серверу

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
```

### Управление сервисом

```bash
# Статус
sudo systemctl status ux-audit-backend

# Перезапуск
sudo systemctl restart ux-audit-backend

# Остановка
sudo systemctl stop ux-audit-backend

# Запуск
sudo systemctl start ux-audit-backend
```

### Просмотр логов

```bash
# Все логи в реальном времени
sudo journalctl -u ux-audit-backend -f

# Последние 100 строк
sudo journalctl -u ux-audit-backend -n 100

# Логи за сегодня
sudo journalctl -u ux-audit-backend --since today
```

### Обновление приложения

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
cd /opt/ux-audit
git pull origin main
cd backend
npm install
npm run build
sudo systemctl restart ux-audit-backend
```

## 🌐 Настройка Nginx (опционально)

Если хотите использовать домен и SSL:

```bash
./deploy-jino-nginx.sh root@53893873b619.vps.myjino.ru your-domain.com 49376
```

Затем установите SSL:

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## ✅ Готово!

Backend будет доступен на:
- `http://53893873b619.vps.myjino.ru:4001` (прямой доступ)
- `https://your-domain.com` (через Nginx + SSL, если настроено)

Обновите `CORS_ORIGIN` в `.env` на URL вашего frontend на Vercel.

