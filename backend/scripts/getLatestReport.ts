import { initDatabase, getDb } from '../database/db.js';

async function getLatestReport() {
  await initDatabase();
  const db = getDb();
  
  const report = await db.get<{
    id: string;
    url: string;
    report_data: string;
    created_at: string;
  }>('SELECT id, url, report_data, created_at FROM reports ORDER BY created_at DESC LIMIT 1');
  
  if (!report) {
    console.log('❌ Отчеты не найдены в базе данных');
    return;
  }
  
  console.log('📊 Последний отчет:');
  console.log('ID:', report.id);
  console.log('URL:', report.url);
  console.log('Создан:', report.created_at);
  console.log('---');
  
  const reportData = JSON.parse(report.report_data);
  
  console.log('📈 Общая оценка:', reportData.summary?.overallScore || 'N/A');
  console.log('---');
  
  if (reportData.summary?.summary) {
    console.log('📝 Резюме:');
    console.log(reportData.summary.summary);
    console.log('\n---');
  }
  
  if (reportData.summary?.strengths && reportData.summary.strengths.length > 0) {
    console.log('\n✅ Сильные стороны:');
    reportData.summary.strengths.forEach((s: string, i: number) => {
      console.log(`${i + 1}. ${s}`);
    });
  }
  
  if (reportData.summary?.weaknesses && reportData.summary.weaknesses.length > 0) {
    console.log('\n⚠️ Области для улучшения:');
    reportData.summary.weaknesses.forEach((w: string, i: number) => {
      console.log(`${i + 1}. ${w}`);
    });
  }
  
  if (reportData.categories) {
    console.log('\n📂 Категории:');
    reportData.categories.forEach((cat: any) => {
      console.log(`- ${cat.name}: ${cat.score || 'N/A'}/100 (проблем: ${cat.issues?.length || 0})`);
    });
  }
  
  console.log('\n---');
  console.log('Полный отчет сохранен в базе данных. ID:', report.id);
}

getLatestReport().catch(console.error);

