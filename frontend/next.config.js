/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  // Проксирование API запросов через Vercel для обхода Mixed Content
  // Примечание: rewrites не работают для POST запросов, поэтому используем API routes
  async rewrites() {
    // Используем API_URL (серверная переменная) или NEXT_PUBLIC_API_URL как fallback
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://53893873b619.vps.myjino.ru';
    
    // Если указан полный URL, используем проксирование (только для GET запросов)
    if (backendUrl.startsWith('http://') || backendUrl.startsWith('https://')) {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    
    // Если URL не указан или относительный, не используем проксирование
    return [];
  },
}

module.exports = nextConfig

