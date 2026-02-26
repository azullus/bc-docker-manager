import { render, screen, fireEvent } from '@testing-library/react';
import DeploymentModal from '@/components/DeploymentModal';

// Mock deployment context
const mockDeployment = {
  status: 'idle' as const,
  containerName: null as string | null,
  version: null as string | null,
  output: [] as string[],
  startedAt: null as Date | null,
};

const mockClearDeployment = jest.fn();

jest.mock('@/lib/deployment-context', () => ({
  useDeployment: () => ({
    deployment: mockDeployment,
    clearDeployment: mockClearDeployment,
  }),
}));

describe('DeploymentModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset deployment state
    mockDeployment.status = 'idle';
    mockDeployment.containerName = null;
    mockDeployment.version = null;
    mockDeployment.output = [];
    mockDeployment.startedAt = null;
  });

  describe('Visibility', () => {
    it('should return null when isOpen is false', () => {
      const { container } = render(
        <DeploymentModal isOpen={false} onClose={mockOnClose} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('should render when isOpen is true', () => {
      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Container Deployment')).toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    it('should show container name when deploying', () => {
      mockDeployment.containerName = 'bcserver-test';
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Deploying bcserver-test')).toBeInTheDocument();
    });

    it('should show BC version when available', () => {
      mockDeployment.version = '25.0';
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('BC Version: 25.0')).toBeInTheDocument();
    });

    it('should show generic title when no container name', () => {
      mockDeployment.status = 'idle';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Container Deployment')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should show "Deploying..." status when running', () => {
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Deploying...')).toBeInTheDocument();
    });

    it('should show "Deployment Complete" on success', () => {
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Deployment Complete')).toBeInTheDocument();
    });

    it('should show "Deployment Failed" on error', () => {
      mockDeployment.status = 'error';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Deployment Failed')).toBeInTheDocument();
    });
  });

  describe('Output Display', () => {
    it('should show "No deployment output..." when output is empty', () => {
      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('No deployment output...')).toBeInTheDocument();
    });

    it('should render output lines', () => {
      mockDeployment.output = [
        'Starting deployment...',
        'Pulling image...',
        'Container created',
      ];
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Starting deployment...')).toBeInTheDocument();
      expect(screen.getByText('Pulling image...')).toBeInTheDocument();
      expect(screen.getByText('Container created')).toBeInTheDocument();
    });

    it('should color SUCCESS lines green', () => {
      mockDeployment.output = ['Container deployment SUCCESS'];
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      const successLine = screen.getByText('Container deployment SUCCESS');
      expect(successLine).toHaveClass('text-green-400');
    });

    it('should color ERROR lines red', () => {
      mockDeployment.output = ['ERROR: Deployment failed'];
      mockDeployment.status = 'error';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      const errorLine = screen.getByText('ERROR: Deployment failed');
      expect(errorLine).toHaveClass('text-red-400');
    });

    it('should color WARNING lines yellow', () => {
      mockDeployment.output = ['WARNING: Low disk space'];
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      const warningLine = screen.getByText('WARNING: Low disk space');
      expect(warningLine).toHaveClass('text-yellow-400');
    });

    it('should color debug lines with dimmed style', () => {
      mockDeployment.output = ['[DEBUG] Internal debug info'];
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      const debugLine = screen.getByText('[DEBUG] Internal debug info');
      expect(debugLine).toHaveClass('text-gray-500');
    });
  });

  describe('Footer Actions', () => {
    it('should show "Hide (continues in background)" while running', () => {
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Hide (continues in background)')).toBeInTheDocument();
    });

    it('should show "Close" button when not running', () => {
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should show "Clear & Close" button when not running', () => {
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Clear & Close')).toBeInTheDocument();
    });

    it('should not show "Clear & Close" while running', () => {
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.queryByText('Clear & Close')).not.toBeInTheDocument();
    });

    it('should call clearDeployment and onClose when Clear & Close is clicked', () => {
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Clear & Close'));

      expect(mockClearDeployment).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button is clicked', () => {
      mockDeployment.status = 'success';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Close'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      mockDeployment.status = 'idle';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      // Click the backdrop (the first overlay div)
      const backdrop = document.querySelector('.bg-black\\/60');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Started Time', () => {
    it('should display start time when startedAt is set', () => {
      const startTime = new Date('2024-01-15T10:30:00Z');
      mockDeployment.startedAt = startTime;
      mockDeployment.status = 'running';

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });

    it('should not display start time when startedAt is null', () => {
      mockDeployment.startedAt = null;

      render(<DeploymentModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.queryByText(/Started:/)).not.toBeInTheDocument();
    });
  });
});
