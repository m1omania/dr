# Исправление установки Playwright на сервере

## Проблема
Playwright не может установить браузеры из-за проблем с GPG ключами репозиториев.

## Решение 1: Проверить, установлен ли Chromium

```bash
# Проверить, есть ли уже установленный Chromium
ls -la ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null || echo "Chromium не найден"

# Или проверить системный Chromium
which chromium-browser || which google-chrome || echo "Системный браузер не найден"
```

## Решение 2: Установить без системных зависимостей

Если системные зависимости уже установлены:

```bash
cd /opt/ux-audit/backend
npx playwright install chromium --force
```

## Решение 3: Исправить GPG ключи (если нужны системные зависимости)

```bash
# Исправить ключ для NodeSource
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Исправить ключ для Nginx (если используется)
curl -fsSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor -o /etc/apt/keyrings/nginx.gpg

# Обновить и установить зависимости
apt-get update
npx playwright install-deps chromium
npx playwright install chromium
```

## Решение 4: Использовать системный Chromium (если установлен)

Если на сервере уже есть Chromium, можно указать путь в коде или через переменную окружения:

```bash
# Проверить наличие системного Chromium
which chromium-browser

# Если есть, можно использовать его через переменную окружения
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Проверка работы

После установки проверьте:

```bash
# Проверить логи сервиса
journalctl -u ux-audit-backend -n 100 --no-pager | grep -i "playwright\|chromium\|browser"

# Проверить, запускается ли браузер
cd /opt/ux-audit/backend
node -e "const {chromium} = require('playwright'); chromium.launch({headless: true}).then(b => {console.log('✅ Браузер запустился'); b.close();}).catch(e => console.error('❌ Ошибка:', e.message));"
```

