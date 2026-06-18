import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/utils/dateRanges';
import { calculatePercentageChange } from '@/utils/calculations';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';

  try {
    const { current, previous } = getDateRange(range);

    const trackedChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
      select: { channelId: true },
    });
    const channelIds = trackedChannels.map((c) => c.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({
        views: { current: 0, previous: 0, change: 0 },
        revenue: { current: 0, previous: 0, change: 0 },
        subscribers: { current: 0, previous: 0, change: 0 },
        watchTime: { current: 0, previous: 0, change: 0 },
      });
    }

    const currentData = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: current.startDate, lte: current.endDate },
      },
    });

    const previousData = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: previous.startDate, lte: previous.endDate },
      },
    });

    // Sums
    const curViews = currentData.reduce((sum, d) => sum + d.views, 0);
    const prevViews = previousData.reduce((sum, d) => sum + d.views, 0);

    const curRev = currentData.reduce((sum, d) => sum + d.estimatedRevenue, 0);
    const prevRev = previousData.reduce((sum, d) => sum + d.estimatedRevenue, 0);

    const curSubs = currentData.reduce((sum, d) => sum + d.netSubscribers, 0);
    const prevSubs = previousData.reduce((sum, d) => sum + d.netSubscribers, 0);

    const curWatch = currentData.reduce((sum, d) => sum + d.estimatedMinutesWatched, 0) / 60;
    const prevWatch = previousData.reduce((sum, d) => sum + d.estimatedMinutesWatched, 0) / 60;

    return NextResponse.json({
      views: {
        current: curViews,
        previous: prevViews,
        change: calculatePercentageChange(curViews, prevViews),
      },
      revenue: {
        current: parseFloat(curRev.toFixed(2)),
        previous: parseFloat(prevRev.toFixed(2)),
        change: calculatePercentageChange(curRev, prevRev),
      },
      subscribers: {
        current: curSubs,
        previous: prevSubs,
        change: calculatePercentageChange(curSubs, prevSubs),
      },
      watchTime: {
        current: parseFloat(curWatch.toFixed(1)),
        previous: parseFloat(prevWatch.toFixed(1)),
        change: calculatePercentageChange(curWatch, prevWatch),
      },
    });
  } catch (error: any) {
    console.error('Error fetching trends:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
