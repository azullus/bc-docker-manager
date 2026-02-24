import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (!origin || !host) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    } catch {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
