import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SyncService } from '@/services/syncService';

export async function POST() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncService = new SyncService();
    // Start background sync
    syncService.performDailySync().catch((err) => {
      console.error('Background sync failed:', err);
    });

    return NextResponse.json({ success: true, message: 'Sync started in background.' });
  } catch (error: any) {
    console.error('Error starting sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
