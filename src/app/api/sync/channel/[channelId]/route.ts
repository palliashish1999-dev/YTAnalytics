import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SyncService } from '@/services/syncService';
import { formatDateToYMD } from '@/utils/dateRanges';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { channelId } = await params;
  const { searchParams } = new URL(request.url);
  
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDateToYMD(yesterday);
    startDate = startDate || dateStr;
    endDate = endDate || dateStr;
  }

  try {
    const syncService = new SyncService();
    await syncService.syncChannelData(channelId, startDate, endDate);
    return NextResponse.json({ 
      success: true, 
      message: `Channel ${channelId} synced from ${startDate} to ${endDate}.` 
    });
  } catch (error: any) {
    console.error(`Error syncing channel ${channelId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
