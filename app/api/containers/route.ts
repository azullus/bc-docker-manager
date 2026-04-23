/**
 * Containers API Route
 *
 * Web-mode stub. Real Docker access is via Electron IPC
 * (electron/ipc-handlers.js). This endpoint exists so the web-mode fallback
 * in lib/electron-api.ts has something to call.
 *
 * Statically exported so the Electron build (`output: 'export'`) can include
 * it without error. Non-GET methods are intentionally absent — they can't
 * be statically exported, and web mode cannot perform real operations
 * anyway.
 */

import { NextResponse } from 'next/server';
import type { BCContainer, ApiResponse } from '@/lib/types';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  const response: ApiResponse<BCContainer[]> = {
    success: true,
    data: [],
    error: 'Web mode: Docker API access not configured. Please use the Electron desktop app for full functionality.',
  };
  return NextResponse.json(response);
}
