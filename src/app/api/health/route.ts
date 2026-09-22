import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'ok', time: new Date().toISOString() });
  } catch (err) {
    console.error('[health] fallo de conexión a la base de datos', err);
    return NextResponse.json({ status: 'error', db: 'error' }, { status: 503 });
  }
}
