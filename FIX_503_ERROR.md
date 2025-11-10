# Исправление ошибки 503 "Ошибка сети при подключении к backend"

## Проблема
Vercel не может подключиться к backend на VPS, возвращается ошибка 503.

## Возможные причины

### 1. Backend недоступен извне
Backend не слушает на всех интерфейсах (0.0.0.0) или порт 4001 закрыт firewall.

**Решение:**
```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
cd /opt/ux-audit/backend
git pull origin main
npm run build
systemctl restart ux-audit-backend

# Проверить, что слушает на 0.0.0.0
netstat -tulpn | grep 4001
# Должно быть: tcp 0 0 0.0.0.0:4001 (не только :::4001)

# Проверить доступность извне
curl http://53893873b619.vps.myjino.ru:4001/health
```

### 2. Vercel блокирует исходящие HTTP запросы
Vercel может блокировать исходящие HTTP запросы к небезопасным серверам (без HTTPS).

**Решение: Настроить HTTPS через Nginx**

#### Вариант A: Без домена (временное решение)
Используйте IP адрес напрямую, но это не решит проблему с Vercel, если он блокирует HTTP.

#### Вариант B: С доменом (рекомендуется)
1. Настройте Nginx как reverse proxy:
```bash
./deploy-jino-nginx.sh root@53893873b619.vps.myjino.ru your-domain.com 49376
```

2. Установите SSL сертификат:
```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. Обновите переменную окружения на Vercel:
- Name: `API_URL`
- Value: `https://your-domain.com`

## Быстрая проверка

### 1. Проверить доступность backend извне
```bash
curl http://53893873b619.vps.myjino.ru:4001/health
```

Если не работает, backend недоступен извне.

### 2. Проверить логи Vercel
В Vercel Dashboard:
- Deployments → [ваш деплой] → Functions → api/audit → Logs

Ищите:
- `ECONNREFUSED` - backend недоступен извне
- `fetch failed` - Vercel блокирует HTTP запросы
- `timeout` - backend слишком медленный

### 3. Проверить логи backend на сервере
```bash
ssh -p 49376 root@53893873b619.vps.myjino.ru
journalctl -u ux-audit-backend -f
```

## Рекомендуемое решение

1. **Обновить backend на сервере** (чтобы слушал на 0.0.0.0)
2. **Настроить Nginx с HTTPS** (если есть домен)
3. **Обновить API_URL на Vercel** на HTTPS URL

## Если нет домена

Если у вас нет домена, можно:
1. Использовать бесплатный домен (например, через Freenom)
2. Или использовать IP адрес, но Vercel может блокировать HTTP запросы

В этом случае нужно проверить, действительно ли Vercel блокирует HTTP запросы, или проблема в доступности backend извне.

