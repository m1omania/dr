import { Router } from 'express';
import { takeScreenshot, getPageMetrics } from '../services/screenshot.js';
import { parseHTML } from '../services/htmlParser.js';
import { analyzeScreenshot } from '../services/visionAnalysis.js';
import { generateReport } from '../services/reportGenerator.js';
import { getDb, initDatabase } from '../../database/db.js';
import puppeteer from 'puppeteer';

const router = Router();

// Initialize database on first request
let dbInitialized = false;

router.post('/', async (req, res) => {
  let browser: puppeteer.Browser | null = null;
  let page: puppeteer.Page | null = null;

  try {
    const { url, image } = req.body;
    
    // Проверяем, что передан либо URL, либо картинка
    if (!url && !image) {
      return res.status(400).json({ error: 'URL or image is required' });
    }

    // Если передана картинка, обрабатываем её напрямую
    if (image) {
      if (typeof image !== 'string') {
        return res.status(400).json({ error: 'Invalid image format. Expected base64 data URL string' });
      }
      
      // Проверяем и нормализуем формат base64 data URL
      let imageDataUrl = image.trim();
      const imageDataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,/i;
      
      // Проверяем формат
      if (!imageDataUrlPattern.test(imageDataUrl)) {
        console.log('⚠️ Изображение не соответствует стандартному формату');
        console.log('   Первые 100 символов:', imageDataUrl.substring(0, 100));
        
        // Если формат не соответствует, пытаемся исправить
        // Проверяем, может быть это raw base64 без префикса
        const base64Only = imageDataUrl.replace(/^data:image\/[^;]+;base64,/, '');
        
        if (base64Only.startsWith('/9j/') || /^[A-Za-z0-9+/=\s]+$/.test(base64Only.replace(/\s/g, ''))) {
          // Похоже на raw base64 (JPEG начинается с /9j/), добавляем префикс
          const cleanBase64 = base64Only.replace(/\s/g, '');
          imageDataUrl = `data:image/jpeg;base64,${cleanBase64}`;
          console.log('✅ Добавлен префикс JPEG к raw base64');
        } else {
          console.error('❌ Не удалось определить формат изображения');
          return res.status(400).json({ 
            error: 'Invalid image format. Expected base64 data URL (data:image/[type];base64,...)',
            hint: 'Make sure the image is a valid base64 encoded image',
            receivedPreview: imageDataUrl.substring(0, 100)
          });
        }
      }
      
      // Проверяем, что base64 данные присутствуют после префикса
      const base64Match = imageDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (!base64Match || !base64Match[1] || base64Match[1].length < 100) {
        return res.status(400).json({ 
          error: 'Invalid image: base64 data is missing or too short',
          hint: 'The image data appears to be empty or corrupted'
        });
      }

      // Initialize database if needed
      if (!dbInitialized) {
        await initDatabase();
        dbInitialized = true;
      }

      const db = getDb();

      // Генерируем ID для отчета
      const reportId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const normalizedUrl = `image_upload_${reportId}`;

      // Анализируем картинку напрямую через Vision API
      console.log('📸 Начинаю визуальный анализ загруженной картинки...');
      console.log('   Формат изображения:', imageDataUrl.substring(0, 30) + '...');
      console.log('   Размер изображения (base64 длина):', imageDataUrl.length, 'символов');
      
      try {
        const visionAnalysis = await analyzeScreenshot(imageDataUrl);
        console.log('✅ Визуальный анализ завершен');
        console.log('   Найдено проблем:', visionAnalysis.issues.length);
        console.log('   Рекомендаций:', visionAnalysis.suggestions.length);
        console.log('   Оценка:', visionAnalysis.overallScore);

        // Создаем минимальные метрики для отчета (так как нет HTML)
        const metrics = {
          loadTime: 0,
          hasViewport: false,
          hasTitle: false,
          fontSizes: {
            minSize: 16,
            maxSize: 16,
            mainTextSize: 16,
            issues: [],
          },
          contrast: {
            issues: [],
            score: 100,
          },
          ctas: {
            count: 0,
            issues: [],
          },
          responsive: false,
        };

        const screenshots = {
          desktop: imageDataUrl, // Используем загруженную картинку как скриншот
          mobile: imageDataUrl, // Используем ту же картинку для мобильной версии
        };

        // Generate report
        const report = generateReport({
          url: normalizedUrl,
          metrics,
          visionAnalysis,
          screenshots,
        });

        // Save report to database
        await db.run(
          'INSERT INTO reports (id, url, report_data) VALUES (?, ?, ?)',
          [report.id, normalizedUrl, JSON.stringify(report)]
        );

        return res.json({ reportId: report.id, report });
      } catch (visionError) {
        console.error('❌ Ошибка при анализе изображения:', visionError);
        if (visionError instanceof Error) {
          console.error('   Message:', visionError.message);
          console.error('   Stack:', visionError.stack?.substring(0, 500));
        }
        throw visionError; // Пробрасываем ошибку дальше для общей обработки
      }
    }

    // Обработка URL (существующая логика)
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required and must be a string' });
    }

    // Initialize database if needed
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const db = getDb();

    // Normalize URL for consistency
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Delete existing reports for this URL to allow overwriting
    await db.run('DELETE FROM reports WHERE url = ?', [normalizedUrl]);
    console.log('🗑️  Удалены старые отчеты для URL:', normalizedUrl);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Get page metrics and HTML
    const startTime = Date.now();

    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000, // Увеличиваем таймаут до 30 секунд
    });
    const loadTime = Date.now() - startTime;
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Parse HTML and get metrics
    const metrics = await parseHTML(page, loadTime);

    // Для анализа AI используем только viewport (видимую область) - как было раньше
    // Это быстрее и надежнее для API
    await page.setViewport({ width: 1280, height: 720 });
    await new Promise(resolve => setTimeout(resolve, 500)); // Даем время на рендеринг
    
    const desktopScreenshotForAI = await page.screenshot({
      type: 'jpeg', // JPEG меньше размер чем PNG
      quality: 85, // Качество для хорошего распознавания
      fullPage: false, // ТОЛЬКО viewport - видимая область (как было раньше)
      encoding: 'base64',
    }) as string;

    // Для отображения пользователю делаем полный скриншот страницы
    const desktopScreenshotFull = await page.screenshot({
      type: 'png',
      fullPage: true, // Полный скриншот всей страницы для отображения
      encoding: 'base64',
    }) as string;
    
    // Мобильный скриншот не создается и не отправляется на анализ
    // (закомментировано для экономии ресурсов)
    /*
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 300));

    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 500));

    const mobileScreenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    }) as string;
    */

    const screenshots = {
      desktop: `data:image/png;base64,${desktopScreenshotFull}`,
      // mobile: `data:image/png;base64,${mobileScreenshot}`, // Мобильный скриншот отключен
    };

    // Analyze with Vision API (используем viewport для быстрого и надежного анализа)
    console.log('📸 Начинаю визуальный анализ скриншота...');
    console.log('   Использую viewport (видимую область) для анализа AI');
    console.log('   Размер скриншота:', desktopScreenshotForAI.length, 'символов');
    const visionAnalysis = await analyzeScreenshot(`data:image/jpeg;base64,${desktopScreenshotForAI}`);
    console.log('✅ Визуальный анализ завершен');
    console.log('   Найдено проблем:', visionAnalysis.issues.length);
    console.log('   Рекомендаций:', visionAnalysis.suggestions.length);
    console.log('   Оценка:', visionAnalysis.overallScore);

    // Generate report
    const report = generateReport({
      url: normalizedUrl,
      metrics,
      visionAnalysis,
      screenshots,
    });

    // Save report to database
    await db.run(
      'INSERT INTO reports (id, url, report_data) VALUES (?, ?, ?)',
      [report.id, normalizedUrl, JSON.stringify(report)]
    );

    res.json({ reportId: report.id, report });
  } catch (error) {
    console.error('❌ Audit error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack?.substring(0, 1000));
      console.error('   Error name:', error.name);
    }
    
    // Закрываем браузер и страницы в случае ошибки
    try {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    } catch (closeError) {
      console.error('❌ Error closing browser:', closeError);
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze website',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack?.substring(0, 500) : undefined) : undefined
    });
  } finally {
    // Дополнительная проверка на случай если ошибка произошла до инициализации
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    } catch (closeError) {
      // Игнорируем ошибки при закрытии
    }
  }
});

export default router;
