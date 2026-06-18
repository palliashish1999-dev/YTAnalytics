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
      orderBy: { date: 'asc' },
    });

    const monthlyMap: Record<
      string,
      {
        monthLabel: string;
        channelName: string;
        views: number;
        revenue: number;
        gained: number;
        lost: number;
        net: number;
        minutes: number;
        totalCtr: number;
        recordCount: number;
        maxCpm: number;
      }
    > = {};

    data.forEach((row) => {
      const date = new Date(row.date);
      const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const groupKey = `${monthLabel}_${row.channelId}`;

      if (!monthlyMap[groupKey]) {
        monthlyMap[groupKey] = {
          monthLabel,
          channelName: row.channel.channelName,
          views: 0,
          revenue: 0,
          gained: 0,
          lost: 0,
          net: 0,
          minutes: 0,
          totalCtr: 0,
          recordCount: 0,
          maxCpm: 0,
        };
      }

      const grp = monthlyMap[groupKey];
      grp.views += row.views;
      grp.revenue += row.estimatedRevenue;
      grp.gained += row.subscribersGained;
      grp.lost += row.subscribersLost;
      grp.net += row.netSubscribers;
      grp.minutes += row.estimatedMinutesWatched;
      grp.totalCtr += row.ctr;
      grp.recordCount += 1;
      grp.maxCpm = Math.max(grp.maxCpm, row.cpm);
    });

    const reportRows = Object.values(monthlyMap).map((grp) => {
      const avgCtr = grp.recordCount > 0 ? parseFloat((grp.totalCtr / grp.recordCount).toFixed(2)) : 0;
      const rpm = calculateRPM(grp.revenue, grp.views);
      return {
        month: grp.monthLabel,
        channelName: grp.channelName,
        views: grp.views,
        revenue: parseFloat(grp.revenue.toFixed(2)),
        subscribersGained: grp.gained,
        subscribersLost: grp.lost,
        netSubscribers: grp.net,
        watchTimeHours: parseFloat((grp.minutes / 60).toFixed(1)),
        ctr: avgCtr,
        rpm,
        cpm: grp.maxCpm,
      };
    }).sort((a, b) => b.month.localeCompare(a.month) || a.channelName.localeCompare(b.channelName));

    return NextResponse.json(reportRows);
  } catch (error: any) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
