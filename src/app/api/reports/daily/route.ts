import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, formatDateToYMD } from '@/utils/dateRanges';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';

  try {
    const { current } = getDateRange(range);

    const trackedChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
      select: { channelId: true, channelName: true },
    });
    const channelIds = trackedChannels.map((c) => c.channelId);

    const data = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: current.startDate, lte: current.endDate },
      },
      include: {
        channel: { select: { channelName: true } },
      },
      orderBy: [{ date: 'desc' }, { channelId: 'asc' }],
    });

    const reportRows = data.map((row) => ({
      date: formatDateToYMD(row.date),
      channelName: row.channel.channelName,
      views: row.views,
      revenue: parseFloat(row.estimatedRevenue.toFixed(2)),
      subscribersGained: row.subscribersGained,
      subscribersLost: row.subscribersLost,
      netSubscribers: row.netSubscribers,
      watchTimeHours: parseFloat(row.watchTimeHours.toFixed(1)),
      averageViewDurationSeconds: row.averageViewDuration,
      impressions: row.impressions,
      ctr: row.ctr,
      rpm: row.rpm,
      cpm: row.cpm,
    }));

    return NextResponse.json(reportRows);
  } catch (error: any) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
