# Исправление конфликта git pull на сервере

## Проблема
`git pull` не прошел из-за локальных изменений в `package-lock.json`

## Решение

Выполните в веб-консоли Jino.ru:

```bash
cd /opt/ux-audit/backend

# Вариант 1: Отменить локальные изменения в package-lock.json и обновить
git checkout -- backend/package-lock.json
git pull origin main

# Вариант 2: Сохранить изменения и обновить (если нужны локальные изменения)
git stash
git pull origin main
git stash pop

# После успешного git pull:
npm install
npx playwright install chromium
npm run build
systemctl restart ux-audit-backend

# Проверить статус:
systemctl status ux-audit-backend

# Проверить логи:
journalctl -u ux-audit-backend -n 50 --no-pager
```

## Проверка установки Playwright

После `npx playwright install chromium` должна появиться информация о загрузке браузера.
Если вывода нет, проверьте:

```bash
# Проверить, установлен ли Playwright
npx playwright --version

# Принудительно установить браузеры
npx playwright install chromium --with-deps
```

