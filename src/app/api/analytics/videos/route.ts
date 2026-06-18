import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/utils/dateRanges';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';
  const sort = searchParams.get('sort') || 'views'; // views, revenue, ctr, rpm
  const customStart = searchParams.get('startDate') || undefined;
  const customEnd = searchParams.get('endDate') || undefined;

  try {
    const { current } = getDateRange(range, customStart, customEnd);

    const trackedChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
      select: { channelId: true },
    });
    const channelIds = trackedChannels.map((c) => c.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({ videos: [], topVideos: [], lowPerforming: [] });
    }

    const videoAnalytics = await prisma.dailyVideoAnalytics.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: current.startDate, lte: current.endDate },
      },
    });

    const videoGroupMap: Record<
      string,
      {
        videoId: string;
        title: string;
        thumbnailUrl: string;
        publishedAt: Date;
        views: number;
        revenue: number;
        watchTime: number;
        subscribers: number;
        totalCtr: number;
        recordCount: number;
        cpm: number;
      }
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
          watchTime: 0,
          subscribers: 0,
          totalCtr: 0,
          recordCount: 0,
          cpm: 0,
        };
      }
      videoGroupMap[item.videoId].views += item.views;
      videoGroupMap[item.videoId].revenue += item.estimatedRevenue;
      videoGroupMap[item.videoId].watchTime += item.watchTimeHours;
      videoGroupMap[item.videoId].subscribers += (item.subscribersGained - item.subscribersLost);
      videoGroupMap[item.videoId].totalCtr += item.ctr;
      videoGroupMap[item.videoId].recordCount += 1;
      videoGroupMap[item.videoId].cpm = Math.max(videoGroupMap[item.videoId].cpm, item.cpm);
    });

    const videosList = Object.values(videoGroupMap).map((v) => {
      const avgCtr = v.recordCount > 0 ? parseFloat((v.totalCtr / v.recordCount).toFixed(2)) : 0;
      const rpm = v.views > 0 ? parseFloat(((v.revenue / v.views) * 1000).toFixed(2)) : 0;
      return {
        videoId: v.videoId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: v.publishedAt,
        views: v.views,
        revenue: parseFloat(v.revenue.toFixed(2)),
        watchTimeHours: parseFloat(v.watchTime.toFixed(1)),
        subscribers: v.subscribers,
        ctr: avgCtr,
        rpm,
        cpm: v.cpm,
      };
    });

    // Sorting logic
    if (sort === 'revenue') {
      videosList.sort((a, b) => b.revenue - a.revenue);
    } else if (sort === 'ctr') {
      videosList.sort((a, b) => b.ctr - a.ctr);
    } else if (sort === 'rpm') {
      videosList.sort((a, b) => b.rpm - a.rpm);
    } else {
      videosList.sort((a, b) => b.views - a.views);
    }

    const topVideos = [...videosList].sort((a, b) => b.views - a.views).slice(0, 5);
    const lowPerforming = [...videosList].sort((a, b) => a.views - b.views).slice(0, 5);

    return NextResponse.json({
      videos: videosList,
      topVideos,
      lowPerforming,
    });

  } catch (error: any) {
    console.error('Error fetching video analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
