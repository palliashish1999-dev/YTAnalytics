import { SyncService } from '../services/syncService';
import { prisma } from '../lib/prisma';

async function main() {
  console.log(`[${new Date().toISOString()}] Scheduled daily sync job starting...`);
  const syncService = new SyncService();
  try {
    await syncService.performDailySync();
    console.log(`[${new Date().toISOString()}] Scheduled daily sync completed successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scheduled daily sync failed:`, error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
