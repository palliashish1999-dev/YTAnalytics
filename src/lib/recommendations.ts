import { prisma } from './prisma';
import { calculatePercentageChange } from '../utils/calculations';

/**
 * Runs a rule-based audit on the synced metrics of a channel and stores actionable items in the DB.
 */
export async function generateRuleBasedRecommendations(channelId: string) {
  // Clear out previous active recommendations to keep recommendations fresh
  await prisma.recommendation.deleteMany({
    where: { channelId, status: 'ACTIVE' },
  });

  const channel = await prisma.youtubeChannel.findUnique({
    where: { channelId },
  });
  if (!channel) return;

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // 1. Fetch current 7-day period vs previous 7-day period
  const currentPeriodData = await prisma.dailyChannelAnalytics.findMany({
    where: {
      channelId,
      date: { gte: sevenDaysAgo, lt: now },
    },
  });

  const previousPeriodData = await prisma.dailyChannelAnalytics.findMany({
    where: {
      channelId,
      date: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
    },
  });

  const currentViews = currentPeriodData.reduce((sum, d) => sum + d.views, 0);
  const previousViews = previousPeriodData.reduce((sum, d) => sum + d.views, 0);
  const currentSubs = currentPeriodData.reduce((sum, d) => sum + d.netSubscribers, 0);
  const previousSubs = previousPeriodData.reduce((sum, d) => sum + d.netSubscribers, 0);

  const viewChangePct = calculatePercentageChange(currentViews, previousViews);
  const subChangePct = calculatePercentageChange(currentSubs, previousSubs);

  // 2. Fetch baseline channel performance metrics
  const allAnalytics = await prisma.dailyChannelAnalytics.findMany({
    where: { channelId },
  });

  const totalViews = allAnalytics.reduce((sum, d) => sum + d.views, 0);
  const totalRevenue = allAnalytics.reduce((sum, d) => sum + d.estimatedRevenue, 0);
  const averageRpm = totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0;
  const averageCtr = allAnalytics.length > 0 ? allAnalytics.reduce((sum, d) => sum + d.ctr, 0) / allAnalytics.length : 0;

  // Latest sync date analytics
  const latestAnalytics = await prisma.dailyChannelAnalytics.findFirst({
    where: { channelId },
    orderBy: { date: 'desc' },
  });

  const recommendations = [];

  // Rule 1: Views Growth Alert (> 20% increase)
  if (viewChangePct > 20) {
    recommendations.push({
      channelId,
      type: 'views_growth',
      title: 'Views are Surging!',
      message: `Views have increased by ${viewChangePct}% in the last 7 days. Consider creating follow-ups or similar topics immediately to capture this audience.`,
      priority: 'HIGH',
      status: 'ACTIVE',
    });
  }

  // Rule 2: Views Drop Warning (> 25% drop)
  if (viewChangePct < -25) {
    recommendations.push({
      channelId,
      type: 'views_drop',
      title: 'Views Decline Detected',
      message: `Views dropped by ${Math.abs(viewChangePct)}% compared to the previous week. Check thumbnail engagement, title relevancy, and video upload frequency.`,
      priority: 'HIGH',
      status: 'ACTIVE',
    });
  }

  // Rule 3: High RPM Opportunity (Latest RPM > Channel Average)
  if (latestAnalytics && latestAnalytics.rpm > averageRpm && latestAnalytics.rpm > 0) {
    recommendations.push({
      channelId,
      type: 'revenue_opportunity',
      title: 'High RPM Opportunity',
      message: `Your latest RPM of $${latestAnalytics.rpm.toFixed(2)} is higher than your channel average of $${averageRpm.toFixed(2)}. Topics uploaded recently are highly valuable—make more of them!`,
      priority: 'MEDIUM',
      status: 'ACTIVE',
    });
  }

  // Rule 4: CTR Warning (Latest CTR < Average CTR)
  if (latestAnalytics && latestAnalytics.ctr < averageCtr && latestAnalytics.ctr > 0) {
    recommendations.push({
      channelId,
      type: 'ctr_warning',
      title: 'Low CTR Alert',
      message: `CTR for your latest videos is ${latestAnalytics.ctr.toFixed(2)}%, which is below your channel average of ${averageCtr.toFixed(2)}%. Re-evaluate your titles and thumbnails.`,
      priority: 'HIGH',
      status: 'ACTIVE',
    });
  }

  // Rule 5: Subscriber Growth acceleration
  if (subChangePct > 15) {
    recommendations.push({
      channelId,
      type: 'subscriber_growth',
      title: 'Subscriber Acceleration',
      message: `Your subscriber growth increased by ${subChangePct}% this week. Leverage this momentum with community posts and channel reminders.`,
      priority: 'MEDIUM',
      status: 'ACTIVE',
    });
  }

  // Rule 6: Upload Time Insight
  const bestDay = await getBestUploadDay(channelId);
  if (bestDay) {
    recommendations.push({
      channelId,
      type: 'upload_time_insight',
      title: 'Optimal Upload Schedule',
      message: `Based on historical video stats, uploads published on ${bestDay} drive the highest view counts. Align your scheduling tool to target ${bestDay}s.`,
      priority: 'LOW',
      status: 'ACTIVE',
    });
  }

  // Write new recommendations to database
  for (const rec of recommendations) {
    await prisma.recommendation.create({
      data: rec,
    });
  }
}

/**
 * Calculates which day of the week generates the highest total views for a channel's videos.
 */
async function getBestUploadDay(channelId: string): Promise<string | null> {
  const videos = await prisma.video.findMany({
    where: { channelId },
  });

  if (videos.length === 0) return null;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: Record<number, { count: number; totalViews: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayStats[i] = { count: 0, totalViews: 0 };
  }

  // Fetch all channel analytics to sum video performance
  const videoAnalytics = await prisma.dailyVideoAnalytics.findMany({
    where: { channelId },
    select: { videoId: true, views: true },
  });

  const videoViewsMap = new Map<string, number>();
  for (const va of videoAnalytics) {
    videoViewsMap.set(va.videoId, (videoViewsMap.get(va.videoId) || 0) + va.views);
  }

  for (const vid of videos) {
    const pubDay = new Date(vid.publishedAt).getDay();
    const totalViews = videoViewsMap.get(vid.videoId) || 0;

    dayStats[pubDay].count += 1;
    dayStats[pubDay].totalViews += totalViews;
  }

  let bestDayIdx = -1;
  let maxAvgViews = 0;

  for (let i = 0; i < 7; i++) {
    const count = dayStats[i].count;
    const avg = count > 0 ? dayStats[i].totalViews / count : 0;
    if (avg > maxAvgViews) {
      maxAvgViews = avg;
      bestDayIdx = i;
    }
  }

  return bestDayIdx !== -1 ? daysOfWeek[bestDayIdx] : null;
}
