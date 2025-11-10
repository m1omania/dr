# Настройка Vercel для Frontend

## ⚠️ Важно: Root Directory

Vercel **НЕ применяет** `rootDirectory` из `vercel.json` автоматически при первом деплое!

## Правильная настройка в Vercel Dashboard:

### 1. При создании проекта:
1. Зайдите на https://vercel.com
2. Нажмите "Add New..." → "Project"
3. Импортируйте репозиторий `m1omania/dr`

### 2. В настройках проекта (ПЕРЕД деплоем):
1. Найдите раздел **"Configure Project"**
2. В поле **"Root Directory"** укажите: `frontend`
3. Нажмите **"Edit"** рядом с Root Directory
4. Выберите папку `frontend` из списка

### 3. Framework Settings:
- **Framework Preset:** Next.js (определится автоматически после указания Root Directory)
- **Build Command:** `npm run build` (автоматически)
- **Output Directory:** `.next` (автоматически)
- **Install Command:** `npm install` (автоматически)

### 4. Environment Variables:
Добавьте:
```
NEXT_PUBLIC_API_URL=https://design-review.onrender.com
```

### 5. Деплой:
Нажмите "Deploy"

## Если проект уже создан:

1. Зайдите в **Settings** вашего проекта
2. Перейдите в раздел **"General"**
3. Найдите **"Root Directory"**
4. Нажмите **"Edit"**
5. Выберите `frontend`
6. Сохраните
7. Перезапустите деплой (Redeploy)

## Проверка:

После деплоя проверьте:
- URL должен открываться без ошибок
- В логах не должно быть "No Next.js version detected"

