import { google } from 'googleapis';
import { getOAuth2Client } from '../lib/google';

export interface AnalyticsDataRow {
  dateOrVideo: string;
  views: number;
  estimatedMinutesWatched: number;
  subscribersGained: number;
  subscribersLost: number;
  averageViewDuration: number;
  estimatedRevenue: number;
  cpm: number;
}

export class YouTubeAnalyticsService {
  private analytics;

  constructor(accessToken: string, refreshToken: string) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.analytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });
  }

  /**
   * Queries daily channel-level analytics.
   */
  async getChannelReport(channelId: string, startDate: string, endDate: string): Promise<AnalyticsDataRow[]> {
    try {
      // Attempt to query with monetization metrics
      const result = await this.queryReport(
        channelId,
        startDate,
        endDate,
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration,estimatedRevenue,cpm',
        'day'
      );
      return this.parseRows(result, true);
    } catch (error) {
      console.warn(`Monetization metrics unavailable for channel ${channelId}. Querying standard traffic metrics...`);
      const result = await this.queryReport(
        channelId,
        startDate,
        endDate,
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration',
        'day'
      );
      return this.parseRows(result, false);
    }
  }

  /**
   * Queries video-level analytics.
   */
  async getVideoReport(channelId: string, startDate: string, endDate: string): Promise<AnalyticsDataRow[]> {
    try {
      const result = await this.queryReport(
        channelId,
        startDate,
        endDate,
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration,estimatedRevenue,cpm',
        'video'
      );
      return this.parseRows(result, true);
    } catch (error) {
      console.warn(`Monetization metrics unavailable for videos of channel ${channelId}. Querying standard traffic metrics...`);
      const result = await this.queryReport(
        channelId,
        startDate,
        endDate,
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration',
        'video'
      );
      return this.parseRows(result, false);
    }
  }

  private async queryReport(
    channelId: string,
    startDate: string,
    endDate: string,
    metrics: string,
    dimensions: string
  ) {
    return await this.analytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics,
      dimensions,
    });
  }

  private parseRows(response: any, includesMonetization: boolean): AnalyticsDataRow[] {
    const headers = response.data.columnHeaders || [];
    const rows = response.data.rows || [];

    const getIndex = (name: string) => headers.findIndex((h: any) => h.name === name);

    const keyIndex = getIndex('day') !== -1 ? getIndex('day') : getIndex('video');
    const viewsIdx = getIndex('views');
    const minutesIdx = getIndex('estimatedMinutesWatched');
    const subGainedIdx = getIndex('subscribersGained');
    const subLostIdx = getIndex('subscribersLost');
    const durationIdx = getIndex('averageViewDuration');
    const revIdx = includesMonetization ? getIndex('estimatedRevenue') : -1;
    const cpmIdx = includesMonetization ? getIndex('cpm') : -1;

    return rows.map((row: any[]) => ({
      dateOrVideo: row[keyIndex] || '',
      views: Number(row[viewsIdx] || 0),
      estimatedMinutesWatched: Number(row[minutesIdx] || 0),
      subscribersGained: Number(row[subGainedIdx] || 0),
      subscribersLost: Number(row[subLostIdx] || 0),
      averageViewDuration: Number(row[durationIdx] || 0),
      estimatedRevenue: revIdx !== -1 ? Number(row[revIdx] || 0) : 0,
      cpm: cpmIdx !== -1 ? Number(row[cpmIdx] || 0) : 0,
    }));
  }
}
