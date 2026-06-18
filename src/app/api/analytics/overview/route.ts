import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, formatDateToYMD } from '@/utils/dateRanges';
import { calculatePercentageChange, calculateRPM } from '@/utils/calculations';

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

    // Get all tracked channels
    const trackedChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
      select: {
        channelId: true,
        channelName: true,
        thumbnailUrl: true,
        subscriberCount: true,
        totalViews: true,
      },
    });

    const channelIds = trackedChannels.map((c) => c.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({
        kpis: {
          views: { value: 0, change: 0 },
          revenue: { value: 0, change: 0 },
          subscribers: { value: 0, change: 0 },
          watchTime: { value: 0, change: 0 },
          rpm: { value: 0, change: 0 },
          ctr: { value: 0, change: 0 },
        },
        charts: { views: [], revenue: [], subscribers: [] },
        insights: { topChannel: null, fastestGrowing: null, revenueLeader: null },
      });
    }

    // Fetch analytics for current and previous period
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

    // 1. Calculate Aggregates
    const curViews = currentAnalytics.reduce((sum, r) => sum + r.views, 0);
    const prevViews = previousAnalytics.reduce((sum, r) => sum + r.views, 0);

    const curRevenue = currentAnalytics.reduce((sum, r) => sum + r.estimatedRevenue, 0);
    const prevRevenue = previousAnalytics.reduce((sum, r) => sum + r.estimatedRevenue, 0);

    const curWatchMinutes = currentAnalytics.reduce((sum, r) => sum + r.estimatedMinutesWatched, 0);
    const prevWatchMinutes = previousAnalytics.reduce((sum, r) => sum + r.estimatedMinutesWatched, 0);
    const curWatchHours = curWatchMinutes / 60;
    const prevWatchHours = prevWatchMinutes / 60;

    const curSubsGained = currentAnalytics.reduce((sum, r) => sum + r.netSubscribers, 0);
    const prevSubsGained = previousAnalytics.reduce((sum, r) => sum + r.netSubscribers, 0);

    const curRpm = calculateRPM(curRevenue, curViews);
    const prevRpm = calculateRPM(prevRevenue, prevViews);

    const totalCtr = currentAnalytics.reduce((sum, r) => sum + r.ctr, 0);
    const avgCtr = currentAnalytics.length > 0 ? parseFloat((totalCtr / currentAnalytics.length).toFixed(2)) : 0;
    const prevTotalCtr = previousAnalytics.reduce((sum, r) => sum + r.ctr, 0);
    const prevAvgCtr = previousAnalytics.length > 0 ? parseFloat((prevTotalCtr / previousAnalytics.length).toFixed(2)) : 0;

    const totalCurrentSubs = trackedChannels.reduce((sum, c) => sum + c.subscriberCount, 0);

    // 2. Build Daily Charts (views, revenue, subscribers)
    const dailyMap: Record<string, { date: string; views: number; revenue: number; netSubscribers: number }> = {};
    
    currentAnalytics.forEach((item) => {
      const dateKey = formatDateToYMD(item.date);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, views: 0, revenue: 0, netSubscribers: 0 };
      }
      dailyMap[dateKey].views += item.views;
      dailyMap[dateKey].revenue += item.estimatedRevenue;
      dailyMap[dateKey].netSubscribers += item.netSubscribers;
    });

    const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Highlight Performers (Top Channel, Revenue Leader, Fastest Growing in period)
    const channelPerfMap: Record<string, { channelId: string; name: string; thumbnail: string; views: number; revenue: number; subs: number }> = {};
    trackedChannels.forEach((c) => {
      channelPerfMap[c.channelId] = {
        channelId: c.channelId,
        name: c.channelName,
        thumbnail: c.thumbnailUrl || '',
        views: 0,
        revenue: 0,
        subs: 0,
      };
    });

    currentAnalytics.forEach((item) => {
      if (channelPerfMap[item.channelId]) {
        channelPerfMap[item.channelId].views += item.views;
        channelPerfMap[item.channelId].revenue += item.estimatedRevenue;
        channelPerfMap[item.channelId].subs += item.netSubscribers;
      }
    });

    const perfArray = Object.values(channelPerfMap);
    let topChannel = null;
    let revenueLeader = null;
    let fastestGrowing = null;

    if (perfArray.length > 0) {
      topChannel = perfArray.reduce((max, c) => (c.views > max.views ? c : max), perfArray[0]);
      revenueLeader = perfArray.reduce((max, c) => (c.revenue > max.revenue ? c : max), perfArray[0]);
      fastestGrowing = perfArray.reduce((max, c) => (c.subs > max.subs ? c : max), perfArray[0]);
    }

    return NextResponse.json({
      kpis: {
        views: {
          value: curViews,
          change: calculatePercentageChange(curViews, prevViews),
        },
        revenue: {
          value: parseFloat(curRevenue.toFixed(2)),
          change: calculatePercentageChange(curRevenue, prevRevenue),
        },
        subscribers: {
          value: totalCurrentSubs,
          change: calculatePercentageChange(curSubsGained, prevSubsGained),
        },
        watchTime: {
          value: parseFloat(curWatchHours.toFixed(1)),
          change: calculatePercentageChange(curWatchHours, prevWatchHours),
        },
        rpm: {
          value: curRpm,
          change: calculatePercentageChange(curRpm, prevRpm),
        },
        ctr: {
          value: avgCtr,
          change: calculatePercentageChange(avgCtr, prevAvgCtr),
        },
      },
      charts: {
        views: chartData.map((d) => ({ date: d.date, value: d.views })),
        revenue: chartData.map((d) => ({ date: d.date, value: parseFloat(d.revenue.toFixed(2)) })),
        subscribers: chartData.map((d) => ({ date: d.date, value: d.netSubscribers })),
      },
      insights: {
        topChannel: topChannel ? { ...topChannel, views: topChannel.views } : null,
        revenueLeader: revenueLeader ? { ...revenueLeader, revenue: parseFloat(revenueLeader.revenue.toFixed(2)) } : null,
        fastestGrowing: fastestGrowing ? { ...fastestGrowing, subsGrowth: fastestGrowing.subs } : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
