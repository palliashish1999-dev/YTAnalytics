import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YouTubeDataService } from '@/services/youtubeDataService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('Google OAuth error callback:', error);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code_provided`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile info to identify the account
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    if (!userInfo.id || !userInfo.email) {
      throw new Error('Google OAuth failed to return user ID or email.');
    }

    // Save tokens in database
    const account = await prisma.googleAccount.upsert({
      where: { googleAccountId: userInfo.id },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined, // refresh token is only sent on first consent
        tokenExpiry: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)),
        scopes: tokens.scope || '',
      },
      create: {
        googleAccountId: userInfo.id,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || '', // can be empty if re-authenticating without consent prompt
        tokenExpiry: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)),
        scopes: tokens.scope || '',
      },
    });

    // Automatically trigger discovery of channels for this account
    const dataService = new YouTubeDataService(account.accessToken, account.refreshToken || tokens.refresh_token || '');
    const channels = await dataService.getMyChannels();
    
    for (const chan of channels) {
      await prisma.youtubeChannel.upsert({
        where: { channelId: chan.channelId },
        update: {
          channelName: chan.channelName,
          channelHandle: chan.channelHandle,
          thumbnailUrl: chan.thumbnailUrl,
          subscriberCount: chan.subscriberCount,
          totalViews: chan.totalViews,
          videoCount: chan.videoCount,
        },
        create: {
          googleAccountId: account.id,
          channelId: chan.channelId,
          channelName: chan.channelName,
          channelHandle: chan.channelHandle,
          thumbnailUrl: chan.thumbnailUrl,
          subscriberCount: chan.subscriberCount,
          totalViews: chan.totalViews,
          videoCount: chan.videoCount,
          isTrackingEnabled: true,
        },
      });
    }

    // Set JWT Session Cookie
    await createSession({
      loggedIn: true,
      googleAccountId: account.id,
      email: userInfo.email,
    });

    // Redirect to channel selection onboarding page
    return NextResponse.redirect(`${appUrl}/onboarding`);
  } catch (err: any) {
    console.error('Error in OAuth callback processing:', err);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message || 'auth_callback_failed')}`);
  }
}
