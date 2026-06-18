import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recommendations = await prisma.recommendation.findMany({
      include: {
        channel: {
          select: {
            channelName: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
