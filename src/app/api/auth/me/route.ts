import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Get active stats for the dashboard
  const googleAccountsCount = await prisma.googleAccount.count();
  const channelsCount = await prisma.youtubeChannel.count();
  const trackingChannelsCount = await prisma.youtubeChannel.count({
    where: { isTrackingEnabled: true },
  });

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    googleAccountsCount,
    channelsCount,
    trackingChannelsCount,
  });
}
