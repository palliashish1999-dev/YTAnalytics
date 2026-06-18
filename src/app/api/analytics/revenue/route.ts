import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, formatDateToYMD } from '@/utils/dateRanges';
import { calculateRPM, projectMonthEndRevenue, calculatePercentageChange } from '@/utils/calculations';

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
      select: { channelId: true, channelName: true, thumbnailUrl: true },
    });

    const channelIds = trackedChannels.map((c) => c.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({
        totalRevenue: { value: 0, change: 0 },
        rpm: { value: 0, change: 0 },
        cpm: { value: 0, change: 0 },
        projection: 0,
        trends: [],
        byChannel: [],
        topVideos: [],
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

    // Sums
    const curRev = currentAnalytics.reduce((sum, d) => sum + d.estimatedRevenue, 0);
    const prevRev = previousAnalytics.reduce((sum, d) => sum + d.estimatedRevenue, 0);
    
    const curViews = currentAnalytics.reduce((sum, d) => sum + d.views, 0);
    const prevViews = previousAnalytics.reduce((sum, d) => sum + d.views, 0);

    const curRpm = calculateRPM(curRev, curViews);
    const prevRpm = calculateRPM(prevRev, prevViews);

    const totalCpm = currentAnalytics.reduce((sum, d) => sum + d.cpm, 0);
    const curCpm = currentAnalytics.length > 0 ? parseFloat((totalCpm / currentAnalytics.length).toFixed(2)) : 0;
    const prevTotalCpm = previousAnalytics.reduce((sum, d) => sum + d.cpm, 0);
    const prevCpm = previousAnalytics.length > 0 ? parseFloat((prevTotalCpm / previousAnalytics.length).toFixed(2)) : 0;

    // Monthly Projection
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedDays = Math.max(0, today.getDate() - 1);
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const mtdData = await prisma.dailyChannelAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: currentMonthStart, lt: today },
      },
    });
    const mtdRevenue = mtdData.reduce((sum, d) => sum + d.estimatedRevenue, 0);
    const projectedRevenue = projectMonthEndRevenue(mtdRevenue, completedDays, totalDays);

    // Trends Chart Data
    const dailyMap: Record<string, { date: string; value: number }> = {};
    currentAnalytics.forEach((item) => {
      const dateKey = formatDateToYMD(item.date);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, value: 0 };
      dailyMap[dateKey].value += item.estimatedRevenue;
    });
    const trends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by Channel (Pie chart)
    const channelMap: Record<string, { name: string; revenue: number; percentage: number }> = {};
    trackedChannels.forEach((c) => {
      channelMap[c.channelId] = { name: c.channelName, revenue: 0, percentage: 0 };
    });
    currentAnalytics.forEach((item) => {
      if (channelMap[item.channelId]) {
        channelMap[item.channelId].revenue += item.estimatedRevenue;
      }
    });

    const byChannel = Object.values(channelMap).map((c) => ({
      name: c.name,
      value: parseFloat(c.revenue.toFixed(2)),
      percentage: curRev > 0 ? parseFloat(((c.revenue / curRev) * 100).toFixed(1)) : 0,
    })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

    // Top Earning Videos in the range
    const videoAnalytics = await prisma.dailyVideoAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: current.startDate, lte: current.endDate },
      },
    });

    const videoGroupMap: Record<
      string,
      { videoId: string; title: string; thumbnailUrl: string; publishedAt: Date; views: number; revenue: number }
    > = {};

    videoAnalytics.forEach((item) => {
      if (!videoGroupMap[item.videoId]) {
        videoGroupMap[item.videoId] = {
          videoId: item.videoId,
          title: item.videoTitle,
          thumbnailUrl: item.thumbnailUrl || '',
          publishedAt: item.publishedAt,
          views: 0,
          revenue: 0,
        };
      }
      videoGroupMap[item.videoId].views += item.views;
      videoGroupMap[item.videoId].revenue += item.estimatedRevenue;
    });

    const topVideos = Object.values(videoGroupMap).map((v) => {
      const rpm = calculateRPM(v.revenue, v.views);
      return {
        videoId: v.videoId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: v.publishedAt,
        revenue: parseFloat(v.revenue.toFixed(2)),
        views: v.views,
        rpm,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return NextResponse.json({
      totalRevenue: {
        value: parseFloat(curRev.toFixed(2)),
        change: calculatePercentageChange(curRev, prevRev),
      },
      rpm: {
        value: curRpm,
        change: calculatePercentageChange(curRpm, prevRpm),
      },
      cpm: {
        value: curCpm,
        change: calculatePercentageChange(curCpm, prevCpm),
      },
      projection: projectedRevenue,
      trends,
      byChannel,
      topVideos,
    });

  } catch (error: any) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
