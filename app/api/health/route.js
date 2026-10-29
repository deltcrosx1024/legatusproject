import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'API Health Status',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
