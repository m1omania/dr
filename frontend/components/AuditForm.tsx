'use client';

import { useState, useRef, useEffect } from 'react';

interface AuditFormProps {
  onAuditStart: (analysisType: 'url' | 'image') => void;
  onAuditComplete: (reportId: string, report: any) => void;
  onError: (error: string) => void;
}

// Список популярных сайтов для примеров
const EXAMPLE_SITES = [
  'mail.ru',
  'yandex.ru',
  'google.com',
  'github.com',
  'stackoverflow.com',
  'reddit.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'amazon.com',
  'ebay.com',
  'aliexpress.com',
  'wildberries.ru',
  'ozon.ru',
  'avito.ru',
  'cian.ru',
  'hh.ru',
  'habr.com',
  'medium.com',
  'wikipedia.org',
  'youtube.com',
  'netflix.com',
  'spotify.com',
  'apple.com',
  'microsoft.com',
  'adobe.com',
  'figma.com',
  'notion.so',
  'trello.com',
];

export default function AuditForm({ onAuditStart, onAuditComplete, onError }: AuditFormProps) {
  const [analysisType, setAnalysisType] = useState<'url' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [randomSites, setRandomSites] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Генерируем 3 случайных сайта при каждом открытии списка
  const generateRandomSites = () => {
    const shuffled = [...EXAMPLE_SITES].sort(() => Math.random() - 0.5);
    setRandomSites(shuffled.slice(0, 3));
  };

  // Функция для сжатия изображения
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Вычисляем новые размеры с сохранением пропорций
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Создаем canvas для сжатия
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Не удалось создать canvas контекст'));
            return;
          }

          // Рисуем изображение на canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Конвертируем в base64 с сжатием
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  };

  // Обработка загрузки файла
  const handleFileSelect = async (file: File) => {
    // Проверка формата файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    if (!file.type.startsWith('image/')) {
      onError('Пожалуйста, выберите изображение');
      return;
    }
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      onError('Неподдерживаемый формат. Используйте JPG, PNG или WebP');
      return;
    }

    // Проверяем размер файла (максимум 10MB до сжатия)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError(`Изображение слишком большое (${(file.size / 1024 / 1024).toFixed(2)} MB). Максимальный размер: 10 MB`);
      return;
    }

    // Проверяем разрешение изображения
    try {
      setLoading(true);
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(imageUrl);
          // Поддерживаем как горизонтальные (1280×720), так и вертикальные (720×1280) изображения
          const maxWidth = 1920;
          const maxHeight = 1920;
          
          if (img.width > maxWidth || img.height > maxHeight) {
            reject(new Error(`Изображение слишком большое (${img.width}×${img.height}px). Максимальное разрешение: 1920×1920px. Рекомендуется: 1280×720 (горизонтальное) или 720×1280 (вертикальное)`));
            return;
          }
          resolve(null);
        };
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Не удалось загрузить изображение для проверки'));
        };
        img.src = imageUrl;
      });

      // Если все проверки пройдены, сжимаем изображение
      const compressedImage = await compressImage(file);
      setImagePreview(compressedImage);
      setImageFile(file);
      setUrl(''); // Очищаем URL при загрузке картинки
      setLoading(false);
    } catch (error) {
      setLoading(false);
      if (error instanceof Error) {
        onError(error.message);
      } else {
        onError('Ошибка при обработке изображения');
      }
    }
  };

  // Обработка drag & drop на всем окне (только для режима анализа по картинке)
  useEffect(() => {
    if (analysisType !== 'image') {
      setIsDragging(false);
      return;
    }

    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      // Проверяем, что перетаскивается файл
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Устанавливаем эффект копирования
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      // Убираем состояние только когда действительно покинули окно
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          handleFileSelect(file);
        } else {
          onError('Пожалуйста, перетащите изображение');
        }
      }
    };

    // Добавляем обработчики на document для перехвата всех событий
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      dragCounter = 0;
      setIsDragging(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisType]);

  // Обработка вставки через Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Очистка картинки
  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const validateUrl = (urlString: string): boolean => {
    try {
      let testUrl = urlString.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'https://' + testUrl;
      }
      new URL(testUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем в зависимости от типа анализа
    if (analysisType === 'url') {
      if (!url.trim()) {
        onError('Введите адрес сайта');
        return;
      }
      if (!validateUrl(url)) {
        onError('Неверный формат URL');
        return;
      }
    } else {
      if (!imageFile || !imagePreview) {
        onError('Загрузите изображение');
        return;
      }
    }

        setLoading(true);
        onAuditStart(analysisType);

    try {
      // Всегда используем относительный путь через Next.js API routes
      // API routes проксируют запросы на backend на серверной стороне
      const apiEndpoint = '/api/audit';
      
      let body: any;
      let headers: Record<string, string> = {};

      if (analysisType === 'image' && imageFile && imagePreview) {
        // Отправляем картинку
        body = JSON.stringify({ 
          image: imagePreview // base64 строка с data:image/...;base64,...
        });
        headers['Content-Type'] = 'application/json';
      } else {
        // Отправляем URL
        body = JSON.stringify({ url: url.trim() });
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body,
      });

      // Пытаемся получить данные даже при ошибке (может быть частичный ответ с reportId)
      let data: any = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('Не удалось распарсить ответ:', parseError);
      }

      if (!response.ok) {
        // Если получили reportId, продолжаем анализ через polling
        if (data && data.reportId && data.report) {
          console.log('⚠️ Получен reportId несмотря на ошибку, продолжаем polling');
          onAuditComplete(data.reportId, data.report);
          return; // Продолжаем polling, не показываем ошибку
        }

        const errorData = data || { error: 'Неизвестная ошибка' };
        
        // Формируем понятное сообщение об ошибке
        let errorMessage = 'Произошла ошибка при анализе';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Добавляем инструкции в зависимости от типа ошибки
        if (response.status === 413 || errorMessage.includes('too large') || errorMessage.includes('слишком большое')) {
          errorMessage += '\n\n💡 Попробуйте:\n- Уменьшить размер изображения\n- Использовать другой URL\n- Проверить интернет-соединение';
        } else if (response.status === 503 || errorMessage.includes('недоступен') || errorMessage.includes('unavailable')) {
          errorMessage += '\n\n💡 Попробуйте:\n- Проверить доступность сайта\n- Попробовать позже\n- Использовать другой URL';
        } else if (response.status === 504 || errorMessage.includes('timeout') || errorMessage.includes('таймаут')) {
          errorMessage += '\n\n💡 Попробуйте:\n- Проверить скорость интернета\n- Использовать более простой сайт\n- Попробовать позже';
        } else {
          errorMessage += '\n\n💡 Попробуйте:\n- Проверить правильность URL\n- Обновить страницу\n- Попробовать снова';
        }
        
        throw new Error(errorMessage);
      }

      // Всегда вызываем onAuditComplete, даже если анализ еще не завершен
      // Это позволит показать скриншот сразу
      if (data && data.reportId) {
        onAuditComplete(data.reportId, data.report);
      } else {
        throw new Error('Не получен reportId от сервера');
      }
      
      // Очищаем форму после успешного получения скриншота
      if (analysisType === 'image') {
        clearImage();
      } else {
        setUrl('');
      }
      
      // Не останавливаем loading - polling будет обновлять статус
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      onError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      {/* Segmented Controls */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            setAnalysisType('url');
            clearImage();
          }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            analysisType === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          disabled={loading}
        >
          Проверить сайт
        </button>
        <button
          type="button"
          onClick={() => {
            setAnalysisType('image');
            setUrl('');
          }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            analysisType === 'image'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          disabled={loading}
        >
          Проверить картинку
        </button>
      </div>

      {analysisType === 'url' ? (
        // Анализ по ссылке - только поле + кнопка
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => {
                generateRandomSites();
                setShowExamples(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowExamples(false), 200);
              }}
              placeholder="Введите адрес сайта"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {showExamples && randomSites.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                {randomSites.map((site, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setUrl(site);
                      setShowExamples(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {site}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'Анализ...' : 'Анализировать'}
          </button>
        </div>
      ) : (
        // Анализ по картинке - drag & drop зона
        <>
          {/* Overlay для drag & drop на всем окне */}
          {isDragging && (
            <div className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg shadow-2xl p-8 border-4 border-blue-500 border-dashed pointer-events-none">
                <div className="text-center">
                  <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-xl font-semibold text-gray-800">Отпустите файл для загрузки</p>
                </div>
              </div>
            </div>
          )}
          <div 
            ref={dropZoneRef}
            className={`relative transition-all ${isDragging ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer?.types.includes('Files')) {
                setIsDragging(true);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Проверяем, что покинули именно этот элемент, а не дочерний
              if (e.currentTarget === e.target) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);

              const files = e.dataTransfer?.files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                  handleFileSelect(file);
                } else {
                  onError('Пожалуйста, перетащите изображение');
                }
              }
            }}
          >
          {imagePreview ? (
            <div className="relative mb-4">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full h-48 object-contain rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                title="Удалить картинку"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors bg-gray-50">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 underline text-lg font-medium disabled:text-gray-400 disabled:cursor-not-allowed mb-2"
                >
                  Выбрать файл
                </button>
                <p className="text-sm text-gray-500">или перетащите изображение сюда</p>
              </div>
            </div>
          )}

          {/* Скрытый input для выбора файла */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
          />

          {/* Требования к изображению (показываем только если картинка не загружена) */}
          {!imagePreview && (
            <div className="mt-4 text-center text-xs text-gray-500">
              <p className="font-medium mb-1">Требования к изображению:</p>
              <ul className="space-y-0.5">
                <li>— Форматы: JPG, PNG, WebP</li>
                <li>— Максимальный размер файла: 10 MB (до сжатия)</li>
                <li>— Максимальное разрешение: 1920×1920px</li>
                <li>— Рекомендуется: 1280×720 (горизонтальное) или 720×1280 (вертикальное)</li>
                <li>— Автоматически сжимается до ≤ 0.8 MB для анализа ИИ</li>
              </ul>
            </div>
          )}

          {/* Кнопка анализа для картинки */}
          {imagePreview && (
            <div className="mt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Анализ...' : 'Анализировать'}
              </button>
            </div>
          )}
          </div>
        </>
      )}
    </form>
  );
}

