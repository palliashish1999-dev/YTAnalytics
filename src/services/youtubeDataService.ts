import { google } from 'googleapis';
import { getOAuth2Client } from '../lib/google';

export class YouTubeDataService {
  private youtube;

  constructor(accessToken: string, refreshToken: string) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Fetches all channels owned or managed by the authenticated Google account.
   */
  async getMyChannels() {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
      maxResults: 50,
    });

    return (response.data.items || []).map((item) => ({
      channelId: item.id!,
      channelName: item.snippet?.title || 'Unknown Channel',
      channelHandle: item.snippet?.customUrl || '',
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || '',
      subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
      totalViews: BigInt(item.statistics?.viewCount || '0'),
      videoCount: parseInt(item.statistics?.videoCount || '0', 10),
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null,
    }));
  }

  /**
   * Fetches profile statistics for specific channel IDs.
   */
  async getChannelsByIds(channelIds: string[]) {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: channelIds,
    });

    return (response.data.items || []).map((item) => ({
      channelId: item.id!,
      channelName: item.snippet?.title || 'Unknown Channel',
      channelHandle: item.snippet?.customUrl || '',
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || '',
      subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
      totalViews: BigInt(item.statistics?.viewCount || '0'),
      videoCount: parseInt(item.statistics?.videoCount || '0', 10),
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null,
    }));
  }

  /**
   * Retrieves the list of recently uploaded videos for a channel by querying the uploads playlist.
   */
  async getRecentVideos(uploadsPlaylistId: string, maxResults = 50) {
    const response = await this.youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults,
    });

    const items = response.data.items || [];
    const videoIds = items.map((item) => item.contentDetails?.videoId).filter(Boolean) as string[];

    if (videoIds.length === 0) return [];

    // Fetch full video details (duration, category)
    const videoDetailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const videoDetailsMap = new Map(
      (videoDetailsResponse.data.items || []).map((item) => [item.id!, item])
    );

    return items.map((item) => {
      const videoId = item.contentDetails!.videoId!;
      const details = videoDetailsMap.get(videoId);

      return {
        videoId,
        title: item.snippet?.title || 'Untitled Video',
        description: item.snippet?.description || '',
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
        publishedAt: new Date(item.snippet?.publishedAt || Date.now()),
        duration: details?.contentDetails?.duration || null,
        categoryId: details?.snippet?.categoryId || null,
      };
    });
  }
}
