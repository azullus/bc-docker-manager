/**
 * Containers API Route
 *
 * Provides REST API endpoints for container operations in web mode.
 * In Electron mode, these are handled via IPC in electron/ipc-handlers.js
 */

import { NextRequest, NextResponse } from 'next/server';
import type { BCContainer, ApiResponse } from '@/lib/types';

// BC container name pattern
const BC_CONTAINER_PATTERN = /^bcserver/;

/**
 * GET /api/containers
 * List all BC containers
 */
export async function GET() {
  try {
    // In web mode, we need Docker API access
    // This requires Docker to be accessible via HTTP (not default on Windows)

    // For now, return a stub response indicating web mode is limited
    const response: ApiResponse<BCContainer[]> = {
      success: true,
      data: [],
      error: 'Web mode: Docker API access not configured. Please use the Electron desktop app for full functionality.',
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<BCContainer[]> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list containers',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/containers
 * Container actions (start, stop, restart, remove)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerId, containerName } = body;

    if (!action || (!containerId && !containerName)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: action and containerId or containerName',
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['start', 'stop', 'restart', 'remove'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // In web mode, Docker API access is limited
    const response: ApiResponse<{ message: string }> = {
      success: false,
      error: 'Web mode: Docker API access not configured. Please use the Electron desktop app for container operations.',
    };

    return NextResponse.json(response, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform container action',
      },
      { status: 500 }
    );
  }
}
