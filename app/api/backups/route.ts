/**
 * Backups API Route
 *
 * Provides REST API endpoints for backup operations in web mode.
 * In Electron mode, these are handled via IPC in electron/ipc-handlers.js
 */

import { NextRequest, NextResponse } from 'next/server';
import type { BackupInfo, BackupSchedule, ApiResponse } from '@/lib/types';

/**
 * GET /api/backups
 * List all backups
 *
 * Query params:
 * - containerName: Filter by container name (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerName = searchParams.get('containerName');

    // In web mode, we cannot access the local filesystem
    const response: ApiResponse<BackupInfo[]> = {
      success: true,
      data: [],
      error: 'Web mode: Filesystem access not available. Please use the Electron desktop app for backup management.',
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list backups',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backups
 * Create a new backup or perform backup actions
 *
 * Body:
 * - action: 'create' | 'restore' | 'delete'
 * - containerName: Container to backup (for create)
 * - backupId: Backup ID (for restore/delete)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerName, backupId } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: action',
        },
        { status: 400 }
      );
    }

    const validActions = ['create', 'restore', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate required fields per action
    if (action === 'create' && !containerName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: containerName',
        },
        { status: 400 }
      );
    }

    if ((action === 'restore' || action === 'delete') && !backupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: backupId',
        },
        { status: 400 }
      );
    }

    // In web mode, we cannot execute PowerShell scripts
    const response: ApiResponse<{ message: string }> = {
      success: false,
      error: 'Web mode: PowerShell execution not available. Please use the Electron desktop app for backup operations.',
    };

    return NextResponse.json(response, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform backup action',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backups
 * Update backup schedule
 *
 * Body: BackupSchedule object
 */
export async function PUT(request: NextRequest) {
  try {
    const schedule: BackupSchedule = await request.json();

    if (!schedule.containerName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: containerName',
        },
        { status: 400 }
      );
    }

    // In web mode, we cannot manage scheduled tasks
    const response: ApiResponse<BackupSchedule> = {
      success: false,
      error: 'Web mode: Scheduled task management not available. Please use the Electron desktop app.',
    };

    return NextResponse.json(response, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update backup schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backups
 * Delete a backup
 *
 * Query params:
 * - backupId: Backup ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: backupId',
        },
        { status: 400 }
      );
    }

    // In web mode, we cannot access the local filesystem
    const response: ApiResponse<{ message: string }> = {
      success: false,
      error: 'Web mode: Filesystem access not available. Please use the Electron desktop app.',
    };

    return NextResponse.json(response, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete backup',
      },
      { status: 500 }
    );
  }
}
