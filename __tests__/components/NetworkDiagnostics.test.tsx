import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NetworkDiagnostics from '@/components/NetworkDiagnostics';

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

describe('NetworkDiagnostics', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunPowerShell.mockResolvedValue({
      stdout: 'Diagnostics output\nNo issues detected',
      stderr: '',
      exitCode: 0,
    });
  });

  describe('Rendering', () => {
    it('should render component title', () => {
      render(<NetworkDiagnostics />);

      expect(screen.getByText('Network Diagnostics')).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<NetworkDiagnostics />);

      expect(screen.getByText(/Analyze HNS state/)).toBeInTheDocument();
    });

    it('should render Scan Network button', () => {
      render(<NetworkDiagnostics />);

      expect(screen.getByText('Scan Network')).toBeInTheDocument();
    });

    it('should render placeholder when no scan has been run', () => {
      render(<NetworkDiagnostics />);

      expect(screen.getByText(/Click "Scan Network" to check/)).toBeInTheDocument();
    });

    it('should not show last run time initially', () => {
      render(<NetworkDiagnostics />);

      expect(screen.queryByText(/Last scan:/)).not.toBeInTheDocument();
    });
  });

  describe('Running Diagnostics', () => {
    it('should call runPowerShell with correct script', async () => {
      render(<NetworkDiagnostics onComplete={mockOnComplete} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(mockRunPowerShell).toHaveBeenCalledWith(
          'scripts/Diagnose-HNS-Ports.ps1',
          []
        );
      });

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
      });
    });

    it('should show loading state during scan', async () => {
      mockRunPowerShell.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          stdout: 'output',
          stderr: '',
          exitCode: 0,
        }), 100))
      );

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      expect(screen.getByText('Scanning...')).toBeInTheDocument();

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText('Scan Network')).toBeInTheDocument();
      });
    });

    it('should disable button during scan', async () => {
      mockRunPowerShell.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          stdout: 'output',
          stderr: '',
          exitCode: 0,
        }), 100))
      );

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      const button = screen.getByText('Scanning...').closest('button');
      expect(button).toBeDisabled();

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText('Scan Network')).toBeInTheDocument();
      });
    });

    it('should show loading toast during scan', async () => {
      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      expect(toast.loading).toHaveBeenCalledWith(
        'Running network diagnostics...',
        { id: 'diagnostics' }
      );

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
      });
    });

    it('should show success toast on completion', async () => {
      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Diagnostics completed',
          { id: 'diagnostics' }
        );
      });

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
      });
    });

    it('should show error toast on failure', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: '',
        stderr: 'Script error',
        exitCode: 1,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Diagnostics failed',
          { id: 'diagnostics' }
        );
      });

      // Wait for running state to be cleared
      await waitFor(() => {
        expect(screen.queryByText('Scanning...')).not.toBeInTheDocument();
      });
    });

    it('should call onComplete callback with output on success', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Line 1\nLine 2\nLine 3',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics onComplete={mockOnComplete} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(['Line 1', 'Line 2', 'Line 3']);
      });

      // Wait for all state updates to complete
      await waitFor(() => {
        expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
      });
    });

    it('should not call onComplete on failure', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: '',
        stderr: 'Error',
        exitCode: 1,
      });

      render(<NetworkDiagnostics onComplete={mockOnComplete} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockOnComplete).not.toHaveBeenCalled();

      // Wait for running state to be cleared
      await waitFor(() => {
        expect(screen.queryByText('Scanning...')).not.toBeInTheDocument();
      });
    });

    it('should update last run timestamp after scan', async () => {
      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
      });
    });
  });

  describe('Issue Parsing', () => {
    it('should show error for orphaned endpoints', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Orphaned endpoints found: 3\nCleanup recommended',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Found 3 orphaned HNS endpoints/)).toBeInTheDocument();
      });
    });

    it('should show warning for NAT mappings', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'BC port mappings: 5\nMay conflict with new deployments',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Found 5 NAT static mappings/)).toBeInTheDocument();
      });
    });

    it('should show warning for excluded port ranges', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Excluded ranges overlapping BC ports detected',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Windows has excluded port ranges/)).toBeInTheDocument();
      });
    });

    it('should show error for Docker not running', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Docker service: not Running\nPlease start Docker Desktop',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Docker service is not running/)).toBeInTheDocument();
      });
    });

    it('should show error for HNS not running', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'HNS service: not Running\nHost Network Service unavailable',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/HNS.*is not running/)).toBeInTheDocument();
      });
    });

    it('should show info message when no issues detected', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'All services running\nNo issues detected\nSystem is healthy',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/HNS state appears clean/)).toBeInTheDocument();
      });
    });

    it('should not show issues when orphaned count is 0', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Orphaned endpoints found: 0\nAll clean',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.queryByText(/orphaned HNS endpoints that need cleanup/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Output Display', () => {
    it('should show collapsible output section after scan', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Line 1\nLine 2\nLine 3',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText('View Full Diagnostic Output (3 lines)')).toBeInTheDocument();
      });
    });

    it('should display output lines when expanded', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Test output line\nAnother line',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/View Full Diagnostic Output/)).toBeInTheDocument();
      });

      const summary = screen.getByText(/View Full Diagnostic Output/);
      fireEvent.click(summary);

      expect(screen.getByText('Test output line')).toBeInTheDocument();
      expect(screen.getByText('Another line')).toBeInTheDocument();
    });

    it('should filter empty lines from output', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Line 1\n\n\nLine 2\n  \nLine 3',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        // Should show 3 lines, not 6
        expect(screen.getByText('View Full Diagnostic Output (3 lines)')).toBeInTheDocument();
      });
    });

    it('should hide placeholder after successful scan', async () => {
      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.queryByText(/Click "Scan Network" to check/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle runPowerShell throwing an error', async () => {
      mockRunPowerShell.mockRejectedValue(new Error('Execution failed'));

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Execution failed',
          { id: 'diagnostics' }
        );
      });

      // Wait for running state to be cleared
      await waitFor(() => {
        expect(screen.queryByText('Scanning...')).not.toBeInTheDocument();
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockRunPowerShell.mockRejectedValue('Unknown failure');

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Diagnostics failed',
          { id: 'diagnostics' }
        );
      });

      // Wait for running state to be cleared
      await waitFor(() => {
        expect(screen.queryByText('Scanning...')).not.toBeInTheDocument();
      });
    });

    it('should re-enable button after error', async () => {
      mockRunPowerShell.mockRejectedValue(new Error('Failed'));

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        const button = screen.getByText('Scan Network').closest('button');
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Multiple Scans', () => {
    it('should update results on subsequent scans', async () => {
      // First scan
      mockRunPowerShell.mockResolvedValueOnce({
        stdout: 'Orphaned endpoints found: 3',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Found 3 orphaned/)).toBeInTheDocument();
      });

      // Second scan with different results
      mockRunPowerShell.mockResolvedValueOnce({
        stdout: 'No issues detected',
        stderr: '',
        exitCode: 0,
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        expect(screen.queryByText(/Found 3 orphaned/)).not.toBeInTheDocument();
        expect(screen.getByText(/HNS state appears clean/)).toBeInTheDocument();
      });
    });
  });

  describe('Issue Color Coding', () => {
    it('should render error issues with appropriate icon', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'Docker service: not Running',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        // Verify the error message is displayed
        expect(screen.getByText(/Docker service is not running/)).toBeInTheDocument();
      });
    });

    it('should render warning issues with appropriate icon', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'BC port mappings: 2',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        // Verify the warning message is displayed
        expect(screen.getByText(/NAT static mappings/)).toBeInTheDocument();
      });
    });

    it('should render info issues with success icon', async () => {
      mockRunPowerShell.mockResolvedValue({
        stdout: 'No issues detected',
        stderr: '',
        exitCode: 0,
      });

      render(<NetworkDiagnostics />);

      await act(async () => {
        fireEvent.click(screen.getByText('Scan Network'));
      });

      await waitFor(() => {
        // Verify the info message is displayed
        expect(screen.getByText(/HNS state appears clean/)).toBeInTheDocument();
      });
    });
  });
});
