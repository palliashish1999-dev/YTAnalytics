import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const channel = await prisma.youtubeChannel.findUnique({
      where: { channelId: id },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const updated = await prisma.youtubeChannel.update({
      where: { channelId: id },
      data: {
        isTrackingEnabled: !channel.isTrackingEnabled,
      },
    });

    return NextResponse.json({
      ...updated,
      totalViews: Number(updated.totalViews),
    });
  } catch (error: any) {
    console.error('Error toggling channel tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
