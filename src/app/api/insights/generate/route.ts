import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRuleBasedRecommendations } from '@/lib/recommendations';

export async function POST() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const trackingChannels = await prisma.youtubeChannel.findMany({
      where: { isTrackingEnabled: true },
    });

    for (const channel of trackingChannels) {
      await generateRuleBasedRecommendations(channel.channelId);
    }

    return NextResponse.json({ success: true, message: 'Recommendations generated successfully.' });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
