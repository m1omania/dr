# Проверка Backend на сервере

## Проблема: SSH недоступен

SSH подключение к серверу недоступно (таймаут). Это может быть из-за:
- Сервер недоступен
- Порт 49376 закрыт firewall
- Провайдер блокирует SSH подключения

## Что можно проверить без SSH

### 1. Проверить доступность backend извне

```bash
# Проверка health endpoint через порт 4001
curl http://53893873b619.vps.myjino.ru:4001/health

# Проверка health endpoint через порт 80 (после настройки перенаправления)
curl http://53893873b619.vps.myjino.ru/health
```

### 2. Проверить доступность API

```bash
# Проверка API endpoint
curl -X POST http://53893873b619.vps.myjino.ru:4001/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Что нужно сделать на сервере (если SSH будет доступен)

### 1. Проверить статус backend

```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
systemctl status ux-audit-backend
```

### 2. Проверить на каких интерфейсах слушает

```bash
netstat -tulpn | grep 4001
```

**Должно быть:** `tcp 0 0 0.0.0.0:4001` (не только `:::4001`)

### 3. Если backend не слушает на 0.0.0.0, обновить

```bash
cd /opt/ux-audit/backend
git pull origin main
npm run build
systemctl restart ux-audit-backend
```

### 4. Проверить доступность изнутри

```bash
curl http://localhost:4001/health
```

Должно вернуть: `{"status":"ok","timestamp":"..."}`

### 5. Проверить логи

```bash
journalctl -u ux-audit-backend -f
```

## Альтернативные способы подключения

Если SSH недоступен, можно попробовать:
1. Использовать веб-консоль в панели Jino.ru (если доступна)
2. Проверить доступность через HTTP/HTTPS
3. Обратиться в поддержку Jino.ru для проверки SSH доступа

## Текущий статус

- ❌ SSH недоступен (таймаут)
- ⏳ Нужно проверить доступность backend через HTTP
- ⏳ Нужно проверить, настроено ли перенаправление портов в панели Jino.ru

