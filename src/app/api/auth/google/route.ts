import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function POST() {
  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error generating Google auth URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
