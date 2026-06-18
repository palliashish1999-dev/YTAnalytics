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

    const weeklyMap: Record<
      string,
      {
        weekLabel: string;
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
      const weekLabel = getWeekLabel(date);
      const groupKey = `${weekLabel}_${row.channelId}`;

      if (!weeklyMap[groupKey]) {
        weeklyMap[groupKey] = {
          weekLabel,
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

      const grp = weeklyMap[groupKey];
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

    const reportRows = Object.values(weeklyMap).map((grp) => {
      const avgCtr = grp.recordCount > 0 ? parseFloat((grp.totalCtr / grp.recordCount).toFixed(2)) : 0;
      const rpm = calculateRPM(grp.revenue, grp.views);
      return {
        week: grp.weekLabel,
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
    }).sort((a, b) => b.week.localeCompare(a.week) || a.channelName.localeCompare(b.channelName));

    return NextResponse.json(reportRows);
  } catch (error: any) {
    console.error('Error generating weekly report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Calculates the ISO-8601 week label (YYYY-Www) for a given date.
 */
function getWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
