import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HNSErrorRecovery from '@/components/HNSErrorRecovery';
import { HNSError } from '@/lib/hns-error-detector';

// Mock electron-api
jest.mock('@/lib/electron-api', () => ({
  runPowerShell: jest.fn(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: Object.assign(
    jest.fn(),
    {
      loading: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
    }
  ),
}));

import { runPowerShell } from '@/lib/electron-api';
import { toast } from 'react-hot-toast';

const mockRunPowerShell = runPowerShell as jest.MockedFunction<typeof runPowerShell>;

describe('HNSErrorRecovery', () => {
  const mockPortConflictError: HNSError = {
    type: 'port_conflict',
    message: 'port already exists (0x803b0013)',
    errorCode: '0x803b0013',
    affectedPorts: [8080, 8443],
    severity: 'critical',
    suggestions: [
      {
        action: 'run_diagnostics',
        title: 'Run Network Diagnostics',
        description: 'Analyze HNS state to identify orphaned endpoints',
        automated: true,
        scriptPath: 'scripts/Diagnose-HNS-Ports.ps1',
      },
      {
        action: 'run_fix_script',
        title: 'Clean HNS State',
        description: 'Remove orphaned endpoints and NAT mappings',
        automated: true,
        scriptPath: 'scripts/Fix-HNS-State.ps1',
      },
      {
        action: 'retry_deployment',
        title: 'Retry Deployment',
        description: 'After cleanup, retry the container deployment',
        automated: true,
      },
    ],
  };

  const mockEndpointError: HNSError = {
    type: 'hns_endpoint',
    message: 'failed to create endpoint on network',
    severity: 'critical',
    suggestions: [
      {
        action: 'run_diagnostics',
        title: 'Run Network Diagnostics',
        description: 'Check for orphaned HNS endpoints',
        automated: true,
        scriptPath: 'scripts/Diagnose-HNS-Ports.ps1',
      },
    ],
  };

  const mockOnRetry = jest.fn();
  const mockOnDiagnosticsComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunPowerShell.mockResolvedValue({
      stdout: 'Script output\nLine 2',
      stderr: '',
      exitCode: 0,
    });
  });

  describe('Rendering', () => {
    it('should render error type description', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Port Conflict Detected')).toBeInTheDocument();
    });

    it('should render error message', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('port already exists (0x803b0013)')).toBeInTheDocument();
    });

    it('should render error code when present', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Error Code: 0x803b0013')).toBeInTheDocument();
    });

    it('should render affected ports when present', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Ports 8080, 8443')).toBeInTheDocument();
    });

    it('should render all suggested actions', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Run Network Diagnostics')).toBeInTheDocument();
      expect(screen.getByText('Clean HNS State')).toBeInTheDocument();
      expect(screen.getByText('Retry Deployment')).toBeInTheDocument();
    });

    it('should render "Run Now" button for automated actions', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      expect(runButtons.length).toBe(3);
    });

    it('should display port conflict explanation for port_conflict type', () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Understanding Port Conflicts')).toBeInTheDocument();
    });

    it('should display endpoint explanation for hns_endpoint type', () => {
      render(
        <HNSErrorRecovery
          error={mockEndpointError}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Understanding HNS Endpoints')).toBeInTheDocument();
    });

    it('should not render error code when not present', () => {
      const errorWithoutCode: HNSError = {
        ...mockPortConflictError,
        errorCode: undefined,
      };

      render(
        <HNSErrorRecovery
          error={errorWithoutCode}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.queryByText(/Error Code:/)).not.toBeInTheDocument();
    });

    it('should not render affected ports when not present', () => {
      const errorWithoutPorts: HNSError = {
        ...mockPortConflictError,
        affectedPorts: undefined,
      };

      render(
        <HNSErrorRecovery
          error={errorWithoutPorts}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.queryByText(/Ports? \d+/)).not.toBeInTheDocument();
    });
  });

  describe('Action Execution', () => {
    it('should run diagnostics when Run Now is clicked', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
          onDiagnosticsComplete={mockOnDiagnosticsComplete}
        />
      );

      // Click the first "Run Now" button (diagnostics)
      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(mockRunPowerShell).toHaveBeenCalledWith(
          'scripts/Diagnose-HNS-Ports.ps1',
          []
        );
      });
    });

    it('should run fix script with -Force flag', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      // Click the second "Run Now" button (clean HNS state)
      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[1]);

      await waitFor(() => {
        expect(mockRunPowerShell).toHaveBeenCalledWith(
          'scripts/Fix-HNS-State.ps1',
          ['-Force']
        );
      });
    });

    it('should call onRetry when retry deployment is clicked', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      // Click the third "Run Now" button (retry)
      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[2]);

      await waitFor(() => {
        expect(mockOnRetry).toHaveBeenCalled();
      });
    });

    it('should call onDiagnosticsComplete with output on success', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Diagnostics output\nNo issues found',
        stderr: '',
        exitCode: 0,
      });

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
          onDiagnosticsComplete={mockOnDiagnosticsComplete}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(mockOnDiagnosticsComplete).toHaveBeenCalledWith(
          expect.arrayContaining(['Diagnostics output', 'No issues found'])
        );
      });
    });

    it('should show loading toast during action execution', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      expect(toast.loading).toHaveBeenCalledWith(
        'Running diagnostics...',
        expect.any(Object)
      );
    });

    it('should show success toast on successful completion', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Diagnostics completed',
          expect.any(Object)
        );
      });
    });

    it('should show error toast on failure', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: '',
        stderr: 'Script failed',
        exitCode: 1,
      });

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Diagnostics failed',
          expect.any(Object)
        );
      });
    });

    it('should prevent multiple simultaneous actions', async () => {
      // Make the first action take longer
      mockRunPowerShell.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          stdout: 'output',
          stderr: '',
          exitCode: 0,
        }), 100))
      );

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');

      // Click first button
      fireEvent.click(runButtons[0]);

      // Try to click second button while first is running
      fireEvent.click(runButtons[1]);

      // Should show error toast for second click
      expect(toast.error).toHaveBeenCalledWith(
        'Please wait for the current action to complete'
      );
    });
  });

  describe('Action State', () => {
    it('should show "Running..." state during execution', async () => {
      mockRunPowerShell.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          stdout: 'output',
          stderr: '',
          exitCode: 0,
        }), 100))
      );

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      expect(screen.getByText('Running...')).toBeInTheDocument();
    });

    it('should show "Completed" state after successful execution', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should disable button after completion', async () => {
      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        const completedButton = screen.getByText('Completed').closest('button');
        expect(completedButton).toBeDisabled();
      });
    });
  });

  describe('Output Display', () => {
    it('should show output in collapsible section after action', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Output line 1\nOutput line 2\nOutput line 3',
        stderr: '',
        exitCode: 0,
      });

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('View Output (3 lines)')).toBeInTheDocument();
      });
    });

    it('should include stderr in output when present', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Standard output',
        stderr: 'Error output',
        exitCode: 0,
      });

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        // Click to expand the output
        const summary = screen.getByText(/View Output/);
        fireEvent.click(summary);

        expect(screen.getByText('STDERR:')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle runPowerShell throwing an error', async () => {
      mockRunPowerShell.mockRejectedValue(new Error('Script execution failed'));

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Script execution failed');
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockRunPowerShell.mockRejectedValue('Unknown error');

      render(
        <HNSErrorRecovery
          error={mockPortConflictError}
          onRetry={mockOnRetry}
        />
      );

      const runButtons = screen.getAllByText('Run Now');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Action failed');
      });
    });
  });

  describe('Non-Automated Actions', () => {
    it('should show toast for restart_docker action', async () => {
      const errorWithRestartSuggestion: HNSError = {
        type: 'service_failure',
        message: 'HNS service not running',
        severity: 'critical',
        suggestions: [
          {
            action: 'restart_docker',
            title: 'Restart Docker',
            description: 'Restart Docker Desktop manually',
            automated: true,
            scriptPath: 'scripts/Fix-HNS-State.ps1',
          },
        ],
      };

      render(
        <HNSErrorRecovery
          error={errorWithRestartSuggestion}
          onRetry={mockOnRetry}
        />
      );

      const runButton = screen.getByText('Run Now');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          'Please restart Docker Desktop manually',
          expect.any(Object)
        );
      });
    });
  });
});
