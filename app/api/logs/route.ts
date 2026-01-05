/**
 * Logs API Route
 *
 * Provides REST API endpoints for container log access in web mode.
 * In Electron mode, these are handled via IPC in electron/ipc-handlers.js
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ContainerLog, ApiResponse } from '@/lib/types';

/**
 * GET /api/logs
 * Get container logs
 *
 * Query params:
 * - containerId: Container ID or name
 * - tail: Number of lines to return (default: 100)
 * - since: Timestamp to start from (optional)
 * - follow: Stream logs (not supported in web mode)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _tail = parseInt(searchParams.get('tail') || '100', 10); // Reserved for Docker API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _since = searchParams.get('since'); // Reserved for Docker API

    if (!containerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: containerId',
        },
        { status: 400 }
      );
    }

    // Validate container name pattern
    if (!containerId.startsWith('bcserver')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid container: Only bcserver-* containers are supported',
        },
        { status: 400 }
      );
    }

    // In web mode, Docker API access is limited
    const response: ApiResponse<ContainerLog[]> = {
      success: true,
      data: [],
      error: 'Web mode: Docker API access not configured. Please use the Electron desktop app for log viewing.',
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch logs',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logs/clear
 * Clear container logs (if supported)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, action } = body;

    if (!containerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: containerId',
        },
        { status: 400 }
      );
    }

    if (action !== 'clear') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Only "clear" is supported.',
        },
        { status: 400 }
      );
    }

    // In web mode, Docker API access is limited
    const response: ApiResponse<{ message: string }> = {
      success: false,
      error: 'Web mode: Docker API access not configured. Please use the Electron desktop app.',
    };

    return NextResponse.json(response, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform log action',
      },
      { status: 500 }
    );
  }
}
