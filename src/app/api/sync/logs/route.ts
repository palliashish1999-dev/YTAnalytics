import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session || !session.loggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await prisma.syncLog.findMany({
      include: {
        channel: {
          select: {
            channelName: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
