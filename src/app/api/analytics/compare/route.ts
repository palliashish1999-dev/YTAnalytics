import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/utils/dateRanges';
import { calculateRPM } from '@/utils/calculations';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';
  const customStart = searchParams.get('startDate') || undefined;
  const customEnd = searchParams.get('endDate') || undefined;

  try {
    const { current } = getDateRange(range, customStart, customEnd);

    const channels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
    });

    const comparisonData = [];

    for (const channel of channels) {
      const analytics = await prisma.dailyChannelAnalytics.findMany({
        where: {
          channelId: channel.channelId,
          date: { gte: current.startDate, lte: current.endDate },
        },
      });

      const totalViews = analytics.reduce((sum, d) => sum + d.views, 0);
      const totalRevenue = analytics.reduce((sum, d) => sum + d.estimatedRevenue, 0);
      const totalMinutes = analytics.reduce((sum, d) => sum + d.estimatedMinutesWatched, 0);
      const totalSubs = analytics.reduce((sum, d) => sum + d.netSubscribers, 0);
      const totalCtr = analytics.reduce((sum, d) => sum + d.ctr, 0);
      const avgCtr = analytics.length > 0 ? parseFloat((totalCtr / analytics.length).toFixed(2)) : 0;
      const rpm = calculateRPM(totalRevenue, totalViews);

      comparisonData.push({
        channelId: channel.channelId,
        channelName: channel.channelName,
        thumbnailUrl: channel.thumbnailUrl,
        views: totalViews,
        revenue: parseFloat(totalRevenue.toFixed(2)),
        subscribers: totalSubs,
        watchTimeHours: parseFloat((totalMinutes / 60).toFixed(1)),
        ctr: avgCtr,
        rpm,
      });
    }

    return NextResponse.json(comparisonData);
  } catch (error: any) {
    console.error('Error fetching comparison analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
