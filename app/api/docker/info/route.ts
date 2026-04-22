/**
 * Docker Info API Route
 *
 * Web-mode stub. Real Docker info is only available when running in the
 * Electron desktop app (where the main process owns the Docker socket via
 * dockerode). This endpoint exists so the sidebar health probe doesn't 404
 * in web mode.
 */

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

interface DockerInfo {
  version: string;
  containers: number;
  running: number;
}

export async function GET() {
  const response: ApiResponse<DockerInfo> = {
    success: false,
    error: 'Web mode: Docker API access not configured. Please use the Electron desktop app for Docker operations.',
  };
  return NextResponse.json(response, { status: 501 });
}
