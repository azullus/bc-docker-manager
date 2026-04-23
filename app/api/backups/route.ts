/**
 * Backups API Route
 *
 * Web-mode stub. Real backup operations require Electron + PowerShell
 * (electron/ipc-handlers.js). This endpoint exists so the web-mode fallback
 * in lib/electron-api.ts has something to call.
 *
 * Statically exported so the Electron build (`output: 'export'`) can include
 * it without error. Non-GET methods are intentionally absent — they can't
 * be statically exported, and web mode cannot perform real backup
 * operations anyway.
 */

import { NextResponse } from 'next/server';
import type { BackupInfo, ApiResponse } from '@/lib/types';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  const response: ApiResponse<BackupInfo[]> = {
    success: true,
    data: [],
    error: 'Web mode: Filesystem access not available. Please use the Electron desktop app for backup management.',
  };
  return NextResponse.json(response);
}
