import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, formatDateToYMD } from '@/utils/dateRanges';
import { calculatePercentageChange } from '@/utils/calculations';

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
    const { current, previous } = getDateRange(range, customStart, customEnd);

    const trackedChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
      select: { channelId: true, channelName: true, thumbnailUrl: true, subscriberCount: true },
    });

    const channelIds = trackedChannels.map((c) => c.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({
        subscribersGained: { value: 0, change: 0 },
        subscribersLost: { value: 0, change: 0 },
        netSubscribers: { value: 0, change: 0 },
        trends: [],
        byChannel: [],
      });
    }

    const currentAnalytics = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: current.startDate, lte: current.endDate },
      },
    });

    const previousAnalytics = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: previous.startDate, lte: previous.endDate },
      },
    });

    const curGained = currentAnalytics.reduce((sum, d) => sum + d.subscribersGained, 0);
    const prevGained = previousAnalytics.reduce((sum, d) => sum + d.subscribersGained, 0);

    const curLost = currentAnalytics.reduce((sum, d) => sum + d.subscribersLost, 0);
    const prevLost = previousAnalytics.reduce((sum, d) => sum + d.subscribersLost, 0);

    const curNet = currentAnalytics.reduce((sum, d) => sum + d.netSubscribers, 0);
    const prevNet = previousAnalytics.reduce((sum, d) => sum + d.netSubscribers, 0);

    // Subscriber trends chart data
    const dailyMap: Record<string, { date: string; gained: number; lost: number; net: number }> = {};
    currentAnalytics.forEach((item) => {
      const dateKey = formatDateToYMD(item.date);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, gained: 0, lost: 0, net: 0 };
      }
      dailyMap[dateKey].gained += item.subscribersGained;
      dailyMap[dateKey].lost += item.subscribersLost;
      dailyMap[dateKey].net += item.netSubscribers;
    });

    const trends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Channel-wise subscriber growth details
    const channelMap: Record<
      string,
      { name: string; thumbnail: string; currentSubs: number; gained: number; lost: number; net: number }
    > = {};

    trackedChannels.forEach((c) => {
      channelMap[c.channelId] = {
        name: c.channelName,
        thumbnail: c.thumbnailUrl || '',
        currentSubs: c.subscriberCount,
        gained: 0,
        lost: 0,
        net: 0,
      };
    });

    currentAnalytics.forEach((item) => {
      if (channelMap[item.channelId]) {
        channelMap[item.channelId].gained += item.subscribersGained;
        channelMap[item.channelId].lost += item.subscribersLost;
        channelMap[item.channelId].net += item.netSubscribers;
      }
    });

    const byChannel = Object.values(channelMap).sort((a, b) => b.net - a.net);

    return NextResponse.json({
      subscribersGained: {
        value: curGained,
        change: calculatePercentageChange(curGained, prevGained),
      },
      subscribersLost: {
        value: curLost,
        change: calculatePercentageChange(curLost, prevLost),
      },
      netSubscribers: {
        value: curNet,
        change: calculatePercentageChange(curNet, prevNet),
      },
      trends,
      byChannel,
    });

  } catch (error: any) {
    console.error('Error fetching subscriber analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
