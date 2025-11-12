import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

// Обновленные требования к платформам
const PLATFORM_REQUIREMENTS = {
  yandex_rsya: { 
    maxLength: 125, 
    recommendedLength: 75,
    name: 'Яндекс РСЯ',
    description: 'Максимум 125 символов (рекомендуется до 75)'
  },
  google_ads: { 
    maxLength: 30, 
    name: 'Google Ads',
    description: 'До 30 символов (3 заголовка)'
  },
  facebook_ads: { 
    maxLength: 40, 
    name: 'Facebook Ads',
    description: 'До 40 символов'
  },
  vk_ads: { 
    maxLength: 60, 
    name: 'VK Реклама',
    description: 'До 60 символов'
  },
  yandex_direct: { 
    maxLength: 33, 
    maxLength2: 75,
    name: 'Яндекс.Директ',
    description: 'Заголовок 1: до 33 символов, Заголовок 2: до 75 символов'
  },
  instagram_ads: { 
    maxLength: 40, 
    name: 'Instagram Ads',
    description: 'До 40 символов'
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyActivity, keyBenefits, platforms } = body;

    if (!companyActivity) {
      return NextResponse.json(
        { error: 'Описание деятельности компании обязательно' },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Выберите хотя бы одну рекламную площадку' },
        { status: 400 }
      );
    }

    // Получаем токен Hugging Face
    const hfToken = process.env.HF || 
                   process.env.HF_TOKEN || 
                   process.env.HUGGINGFACE_API_KEY || 
                   process.env.HUGGINGFACE_TOKEN;

    if (!hfToken) {
      return NextResponse.json(
        { error: 'Hugging Face API не настроен. Установите HUGGINGFACE_API_KEY в переменных окружения.' },
        { status: 500 }
      );
    }

    // Определяем максимальную длину для генерации (берем самую большую из выбранных платформ)
    const maxLength = Math.max(...platforms.map((p: string) => {
      const req = PLATFORM_REQUIREMENTS[p as keyof typeof PLATFORM_REQUIREMENTS];
      if (req) {
        if (p === 'yandex_direct') {
          const yandexReq = req as typeof PLATFORM_REQUIREMENTS.yandex_direct;
          return Math.max(yandexReq.maxLength, yandexReq.maxLength2 || 0);
        }
        return req.maxLength;
      }
      return 30;
    }));

    console.log('🔄 Генерация заголовков с использованием Hugging Face API...');
    console.log('   Деятельность:', companyActivity.substring(0, 100));
    console.log('   Ключевые преимущества:', keyBenefits?.substring(0, 100) || 'не указаны');
    console.log('   Выбранные платформы:', platforms);
    console.log('   Максимальная длина:', maxLength);

    // Формируем детальный промпт для генерации качественных заголовков
    const prompt = `Ты — эксперт по созданию рекламных заголовков. Создай 15 коротких, привлекательных и осмысленных заголовков для рекламных баннеров на основе следующей информации:

Деятельность компании: ${companyActivity}
${keyBenefits ? `Ключевые преимущества: ${keyBenefits}` : ''}

ОСНОВНЫЕ ТРЕБОВАНИЯ К ЗАГОЛОВКАМ:

1. Ясность и конкретика: Заголовок должен быть понятным, простым, избегать сложных конструкций. Сразу объясняет суть предложения.

2. Выделенная выгода: Показывай, какую ключевую пользу получит человек (экономия времени, денег, решение боли, новый результат).

3. Целевая аудитория: В тексте отражай, для кого эта реклама (например, «Для занятых мам» или «Фрилансеру»).

4. Призыв к действию или интрига: Заставляет читать дальше, обещает ответ на вопрос, открывает ценность или задает проблему.

5. Эмоциональность: Используй эмоции (удивление, радость, страх потерять, новизна).

6. Краткость и выразительность: Оптимальная длина — 3–12 слов. Один акцент.

7. Конкретные факты и цифры: Если возможно, используй конкретику (например, «Быстрее на 30%», «Экономьте до 5 000 рублей в месяц»).

8. Актуальность и свежесть: Упоминание современных тенденций, нового подхода, сезона.

9. Уникальное торговое предложение: Подчёркивай отличие от конкурентов.

10. Избегай "кликабельного мусора": Не используй слишком общих, заманивающих фраз без конкретики («Нажмите здесь!», «Улучшите свой», «Лучшее решение» без контекста).

ФОРМУЛИРОВКИ ДЛЯ ИСПОЛЬЗОВАНИЯ:
- «Как [достичь результата] за [срок] без [боли]»
- «[Товар/Сервис] для тех, у кого [проблема]»
- «[Количество] причин, почему [действие]»
- «[Специальное предложение] только до [дата/срок]»
- «Успей [действие], пока действует [предложение]»

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
- Максимальная длина заголовка: ${maxLength} символов (включая пробелы)
- Каждый заголовок на отдельной строке
- Без нумерации и маркеров
- Без кавычек в начале и конце
- Только на русском языке
- Заголовки должны быть уникальными и разными

Верни только заголовки, по одному на строку, без дополнительных комментариев.`;

    try {
      console.log('🔄 Отправка запроса в Hugging Face Inference API...');
      
      // Используем Inference API с моделью для русского языка
      // Пробуем несколько моделей, начиная с тех, которые лучше работают с русским
      let response;
      const models = [
        'ai-forever/rugpt3large_based_on_gpt2', // Русская модель на базе GPT-2
        'sberbank-ai/rugpt3large_based_on_gpt2', // Альтернативная русская модель
        'mistralai/Mixtral-8x7B-Instruct-v0.1', // Универсальная модель
      ];
      
      let lastError: any = null;
      for (const model of models) {
        try {
          console.log(`🔄 Попытка использовать модель: ${model}`);
          response = await axios.post(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              inputs: prompt,
              parameters: {
                max_new_tokens: 800,
                temperature: 0.8,
                top_p: 0.9,
                return_full_text: false,
                do_sample: true,
                repetition_penalty: 1.3,
                top_k: 50
              }
            },
            {
              headers: {
                Authorization: `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 60000,
            }
          );
          console.log(`✅ Успешно использована модель: ${model}`);
          break;
        } catch (error: any) {
          console.log(`❌ Ошибка с моделью ${model}:`, error.response?.status, error.response?.statusText);
          lastError = error;
          // Продолжаем со следующей моделью
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Не удалось использовать ни одну модель');
      }

      console.log('✅ Получен ответ от Hugging Face API');
      console.log('   Response type:', typeof response.data);

      // Обрабатываем ответ от Inference API
      let generatedText = '';
      if (Array.isArray(response.data) && response.data[0]?.generated_text) {
        generatedText = response.data[0].generated_text;
      } else if (response.data?.generated_text) {
        generatedText = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        generatedText = response.data;
      }

      // Убираем исходный промпт из ответа, если он там есть
      if (generatedText.startsWith(prompt)) {
        generatedText = generatedText.substring(prompt.length).trim();
      }

      if (!generatedText) {
        console.error('❌ Пустой ответ от API. Response:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Пустой ответ от Hugging Face API');
      }

      console.log('✅ Сгенерированный текст (первые 300 символов):', generatedText.substring(0, 300));

      // Парсим заголовки из ответа
      const headlines = generatedText
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => {
          // Фильтруем заголовки по критериям
          if (line.length === 0) return false;
          if (line.length > maxLength) return false;
          // Убираем строки, которые являются частью промпта или комментариями
          if (line.match(/^(ТЕХНИЧЕСКИЕ|ОСНОВНЫЕ|ФОРМУЛИРОВКИ|ТРЕБОВАНИЯ|Верни|Заголовок)/i)) return false;
          // Убираем нумерацию
          if (line.match(/^\d+[\.\)\s]/)) return false;
          // Убираем маркеры списка
          if (line.match(/^[-*•]\s/)) return false;
          // Убираем кавычки в начале и конце
          line = line.replace(/^["«]|["»]$/g, '');
          // Проверяем на минимальную длину (не менее 10 символов)
          if (line.length < 10) return false;
          return true;
        })
        .map((line: string) => {
          // Убираем кавычки и лишние пробелы
          return line.replace(/^["«]|["»]$/g, '').trim();
        })
        .filter((line: string) => line.length > 0)
        .slice(0, 20); // Берем максимум 20 заголовков

      if (headlines.length === 0) {
        // Если не получилось сгенерировать через API, используем резервный метод
        console.log('⚠️ Не удалось получить заголовки от API, используем резервный метод');
        headlines.push(...generateFallbackHeadlines(companyActivity, keyBenefits, maxLength));
      }

      console.log('✅ Сгенерировано заголовков:', headlines.length);

      // Генерируем заголовки для каждой выбранной платформы
      const result: Record<string, string[]> = {};
      const requirements: Record<string, any> = {};

      platforms.forEach((platform: string) => {
        const platformReq = PLATFORM_REQUIREMENTS[platform as keyof typeof PLATFORM_REQUIREMENTS];
        if (platformReq) {
          // Для Яндекс.Директ генерируем два типа заголовков
          if (platform === 'yandex_direct') {
            const yandexDirectReq = platformReq as typeof PLATFORM_REQUIREMENTS.yandex_direct;
            const headlines1 = headlines.filter((h: string) => h.length <= yandexDirectReq.maxLength);
            const headlines2 = headlines.filter((h: string) => h.length <= (yandexDirectReq.maxLength2 || 75));
            result[`${platform}_1`] = headlines1;
            result[`${platform}_2`] = headlines2;
            requirements[`${platform}_1`] = { ...yandexDirectReq, maxLength: yandexDirectReq.maxLength, name: `${yandexDirectReq.name} (Заголовок 1)` };
            requirements[`${platform}_2`] = { ...yandexDirectReq, maxLength: yandexDirectReq.maxLength2 || 75, name: `${yandexDirectReq.name} (Заголовок 2)` };
          } else {
            const platformHeadlines = headlines.filter((h: string) => h.length <= platformReq.maxLength);
            result[platform] = platformHeadlines;
            requirements[platform] = platformReq;
          }
        }
      });

      // Собираем все заголовки для общего списка
      const allHeadlines: string[] = [];
      Object.values(result).forEach(headlines => {
        allHeadlines.push(...headlines);
      });
      result.all = [...new Set(allHeadlines)];

      if (result.all.length === 0) {
        return NextResponse.json(
          { error: 'Не удалось сгенерировать заголовки для выбранных платформ' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        headlines: result,
        requirements: requirements
      });

    } catch (error: any) {
      console.error('❌ Hugging Face API error:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Error Data:', JSON.stringify(error.response?.data || error.message).substring(0, 500));

      // Если ошибка API, используем резервный метод генерации
      console.log('⚠️ Используем резервный метод генерации заголовков');
      
      const maxLength = Math.max(...platforms.map((p: string) => {
        const req = PLATFORM_REQUIREMENTS[p as keyof typeof PLATFORM_REQUIREMENTS];
        if (req) {
          if (p === 'yandex_direct') {
            const yandexReq = req as typeof PLATFORM_REQUIREMENTS.yandex_direct;
            return Math.max(yandexReq.maxLength, yandexReq.maxLength2 || 0);
          }
          return req.maxLength;
        }
        return 30;
      }));

      const fallbackHeadlines = generateFallbackHeadlines(companyActivity, keyBenefits, maxLength);

      const result: Record<string, string[]> = {};
      const requirements: Record<string, any> = {};

      platforms.forEach((platform: string) => {
        const platformReq = PLATFORM_REQUIREMENTS[platform as keyof typeof PLATFORM_REQUIREMENTS];
        if (platformReq) {
          if (platform === 'yandex_direct') {
            const yandexDirectReq = platformReq as typeof PLATFORM_REQUIREMENTS.yandex_direct;
            const headlines1 = fallbackHeadlines.filter((h: string) => h.length <= yandexDirectReq.maxLength);
            const headlines2 = fallbackHeadlines.filter((h: string) => h.length <= (yandexDirectReq.maxLength2 || 75));
            result[`${platform}_1`] = headlines1;
            result[`${platform}_2`] = headlines2;
            requirements[`${platform}_1`] = { ...yandexDirectReq, maxLength: yandexDirectReq.maxLength, name: `${yandexDirectReq.name} (Заголовок 1)` };
            requirements[`${platform}_2`] = { ...yandexDirectReq, maxLength: yandexDirectReq.maxLength2 || 75, name: `${yandexDirectReq.name} (Заголовок 2)` };
          } else {
            const platformHeadlines = fallbackHeadlines.filter((h: string) => h.length <= platformReq.maxLength);
            result[platform] = platformHeadlines;
            requirements[platform] = platformReq;
          }
        }
      });

      result.all = [...new Set(fallbackHeadlines)];

      return NextResponse.json({
        success: true,
        headlines: result,
        requirements: requirements
      });
    }

  } catch (error: any) {
    console.error('Banner headlines generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при генерации заголовков' },
      { status: 500 }
    );
  }
}

// Резервная функция для генерации заголовков на основе шаблонов с учетом рекомендаций
function generateFallbackHeadlines(
  companyActivity: string, 
  keyBenefits: string | undefined,
  maxLength: number
): string[] {
  const headlines: string[] = [];
  
  // Извлекаем ключевые слова из описания деятельности
  const activityWords = companyActivity
    .toLowerCase()
    .split(/[\s,\.]+/)
    .filter(word => word.length > 3)
    .slice(0, 5);

  const mainActivity = activityWords[0] || 'сервис';
  const secondActivity = activityWords[1] || 'решение';
  const thirdActivity = activityWords[2] || 'инструмент';

  // Извлекаем ключевые слова из преимуществ
  const benefits: string[] = [];
  if (keyBenefits) {
    const benefitWords = keyBenefits
      .toLowerCase()
      .split(/[\s,\.]+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
    benefits.push(...benefitWords);
  }

  // Определяем целевую аудиторию на основе описания
  const audience = extractAudience(companyActivity);
  
  // Шаблоны с конкретикой, выгодой и эмоциональностью
  const templates: string[] = [];

  // Шаблоны с выгодой (экономия времени, денег, решение проблемы)
  templates.push(`Как ${mainActivity} поможет сэкономить время`);
  templates.push(`Экономьте до 30% с ${mainActivity}`);
  templates.push(`${mainActivity}: решение вашей проблемы`);
  templates.push(`Экономьте до 5000₽ в месяц с ${mainActivity}`);
  templates.push(`${mainActivity} — быстрый результат за 1 день`);

  // Шаблоны с целевой аудиторией
  if (audience) {
    templates.push(`${mainActivity} для ${audience}`);
    templates.push(`${audience}: откройте для себя ${mainActivity}`);
    templates.push(`Для ${audience}: ${mainActivity} с гарантией`);
  }

  // Шаблоны с интригой и призывом к действию
  templates.push(`5 причин выбрать ${mainActivity} уже сегодня`);
  templates.push(`Почему ${mainActivity} выбирают профессионалы`);
  templates.push(`${mainActivity}: новый подход к решению задач`);
  templates.push(`Откройте для себя ${mainActivity} — бесплатно`);
  templates.push(`Успейте получить ${mainActivity} со скидкой`);

  // Шаблоны с конкретными преимуществами
  if (benefits.length > 0) {
    benefits.slice(0, 3).forEach(benefit => {
      templates.push(`${mainActivity} с ${benefit} — уже сегодня`);
      templates.push(`Получите ${benefit} с ${mainActivity}`);
      templates.push(`${benefit} для вашего бизнеса — ${mainActivity}`);
      templates.push(`Как ${mainActivity} даст вам ${benefit}`);
    });
  }

  // Шаблоны с уникальным торговым предложением
  templates.push(`${mainActivity}: то, что отличает вас от конкурентов`);
  templates.push(`Единственный ${mainActivity} с такой гарантией`);
  templates.push(`${mainActivity} — эксклюзивное предложение`);

  // Шаблоны с актуальностью и свежестью
  templates.push(`Новый ${mainActivity} — только в этом сезоне`);
  templates.push(`${mainActivity}: современный подход к бизнесу`);
  templates.push(`Тренд 2024: ${mainActivity} для профессионалов`);

  // Шаблоны в формате "Как достичь результата без боли"
  templates.push(`Как получить ${mainActivity} без лишних затрат`);
  templates.push(`Как ${mainActivity} поможет вам за 1 день`);
  templates.push(`Как ${mainActivity} решает вашу проблему`);

  // Шаблоны с конкретными цифрами и фактами
  templates.push(`${mainActivity}: результат за 24 часа`);
  templates.push(`Быстрее на 50% с ${mainActivity}`);
  templates.push(`${mainActivity}: экономия до 5000₽ в месяц`);

  // Фильтруем заголовки по длине и уникальности
  templates.forEach(template => {
    const headline = template.charAt(0).toUpperCase() + template.slice(1);
    if (headline.length <= maxLength && !headlines.includes(headline)) {
      headlines.push(headline);
    }
  });

  // Убираем дубликаты и ограничиваем количество
  return [...new Set(headlines)].slice(0, 20);
}

// Функция для определения целевой аудитории на основе описания деятельности
function extractAudience(activity: string): string | null {
  const activityLower = activity.toLowerCase();
  
  // Определяем целевую аудиторию по ключевым словам
  if (activityLower.includes('мама') || activityLower.includes('матери') || activityLower.includes('детей')) {
    return 'занятых мам';
  }
  if (activityLower.includes('фриланс') || activityLower.includes('удаленн')) {
    return 'фрилансеров';
  }
  if (activityLower.includes('бизнес') || activityLower.includes('предпринимател')) {
    return 'предпринимателей';
  }
  if (activityLower.includes('студент') || activityLower.includes('обучен')) {
    return 'студентов';
  }
  if (activityLower.includes('профессионал') || activityLower.includes('специалист')) {
    return 'профессионалов';
  }
  if (activityLower.includes('стартап') || activityLower.includes('старт')) {
    return 'стартапов';
  }
  if (activityLower.includes('малый бизнес') || activityLower.includes('малый')) {
    return 'малого бизнеса';
  }
  
  return null;
}
