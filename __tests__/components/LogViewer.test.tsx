import { render, screen, fireEvent } from '@testing-library/react';
import LogViewer from '@/components/LogViewer';
import { ContainerLog } from '@/lib/types';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('LogViewer', () => {
  const mockLogs: ContainerLog[] = [
    {
      timestamp: '2024-01-15T10:00:00.000Z',
      stream: 'stdout',
      message: 'Container started successfully',
    },
    {
      timestamp: '2024-01-15T10:00:01.000Z',
      stream: 'stdout',
      message: 'Initializing database connection',
    },
    {
      timestamp: '2024-01-15T10:00:02.000Z',
      stream: 'stderr',
      message: 'Warning: Low memory detected',
    },
    {
      timestamp: '2024-01-15T10:00:03.000Z',
      stream: 'stdout',
      message: 'Server is ready',
    },
  ];

  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    mockOnRefresh.mockClear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('Container Logs')).toBeInTheDocument();
    });

    it('should render all log messages', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('Container started successfully')).toBeInTheDocument();
      expect(screen.getByText('Initializing database connection')).toBeInTheDocument();
      expect(screen.getByText('Warning: Low memory detected')).toBeInTheDocument();
      expect(screen.getByText('Server is ready')).toBeInTheDocument();
    });

    it('should render stream labels', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);
      const stdoutLabels = screen.getAllByText('[stdout]');
      const stderrLabels = screen.getAllByText('[stderr]');
      expect(stdoutLabels).toHaveLength(3);
      expect(stderrLabels).toHaveLength(1);
    });

    it('should show log count', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Showing 4 of 4 log entries/)).toBeInTheDocument();
    });

    it('should show empty state when no logs', () => {
      render(<LogViewer logs={[]} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });
  });

  describe('Search Filter', () => {
    it('should filter logs by search term', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'database' } });

      expect(screen.getByText('Initializing database connection')).toBeInTheDocument();
      expect(screen.queryByText('Container started successfully')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 4 log entries/)).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'DATABASE' } });

      expect(screen.getByText('Initializing database connection')).toBeInTheDocument();
    });

    it('should show no matching logs message', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No matching logs')).toBeInTheDocument();
    });
  });

  describe('Stream Filter', () => {
    it('should filter by stdout only', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const streamSelect = screen.getByRole('combobox');
      fireEvent.change(streamSelect, { target: { value: 'stdout' } });

      expect(screen.getByText('Container started successfully')).toBeInTheDocument();
      expect(screen.getByText('Initializing database connection')).toBeInTheDocument();
      expect(screen.getByText('Server is ready')).toBeInTheDocument();
      expect(screen.queryByText('Warning: Low memory detected')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 3 of 4 log entries/)).toBeInTheDocument();
    });

    it('should filter by stderr only', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const streamSelect = screen.getByRole('combobox');
      fireEvent.change(streamSelect, { target: { value: 'stderr' } });

      expect(screen.getByText('Warning: Low memory detected')).toBeInTheDocument();
      expect(screen.queryByText('Container started successfully')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 4 log entries/)).toBeInTheDocument();
    });

    it('should show filter indicator when filtering', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const streamSelect = screen.getByRole('combobox');
      fireEvent.change(streamSelect, { target: { value: 'stderr' } });

      expect(screen.getByText('Filtered by: stderr')).toBeInTheDocument();
    });
  });

  describe('Combined Filters', () => {
    it('should apply both search and stream filters', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'started' } });

      const streamSelect = screen.getByRole('combobox');
      fireEvent.change(streamSelect, { target: { value: 'stdout' } });

      expect(screen.getByText('Container started successfully')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 4 log entries/)).toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByTitle('Refresh logs');
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when loading', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} loading />);

      const refreshButton = screen.getByTitle('Refresh logs');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Download', () => {
    it('should create download when download button is clicked', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const downloadButton = screen.getByTitle('Download logs');
      fireEvent.click(downloadButton);

      // Verify that createObjectURL was called to create the blob URL
      expect(mockCreateObjectURL).toHaveBeenCalled();
      // Verify cleanup happened
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Auto-scroll', () => {
    it('should have auto-scroll enabled by default', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const autoScrollCheckbox = screen.getByRole('checkbox');
      expect(autoScrollCheckbox).toBeChecked();
    });

    it('should toggle auto-scroll when checkbox is clicked', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      const autoScrollCheckbox = screen.getByRole('checkbox');
      fireEvent.click(autoScrollCheckbox);

      expect(autoScrollCheckbox).not.toBeChecked();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamps correctly', () => {
      render(<LogViewer logs={mockLogs} onRefresh={mockOnRefresh} />);

      // Timestamps should be formatted as locale time strings
      // The exact format depends on locale, but they should be present
      const logContainer = screen.getByText('Container started successfully').parentElement;
      expect(logContainer?.textContent).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
