import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const channels = await prisma.youtubeChannel.findMany({
      orderBy: { channelName: 'asc' },
    });

    // Safely convert BigInt to Number to avoid JSON serialization crash
    const serializedChannels = channels.map((c) => ({
      ...c,
      totalViews: Number(c.totalViews),
    }));

    return NextResponse.json(serializedChannels);
  } catch (error: any) {
    console.error('Error fetching YouTube channels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
