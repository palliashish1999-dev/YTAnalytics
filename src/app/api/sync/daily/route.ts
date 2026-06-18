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
    await syncService.performDailySync();
    return NextResponse.json({ success: true, message: 'Daily sync executed successfully.' });
  } catch (error: any) {
    console.error('Error in daily sync route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
