import { render, screen, fireEvent } from '@testing-library/react';
import ContainerComparison from '@/components/ContainerComparison';
import { BCContainer } from '@/lib/types';

describe('ContainerComparison', () => {
  const containerA: BCContainer = {
    id: 'abc123',
    name: 'bcserver-bc25',
    status: 'running',
    image: 'mcr.microsoft.com/businesscentral:25.0',
    created: '2024-01-15T10:00:00Z',
    ports: [
      { privatePort: 443, publicPort: 44325, type: 'tcp' },
      { privatePort: 8080, publicPort: 54525, type: 'tcp' },
    ],
    bcVersion: '25.0',
    webClientUrl: 'https://bcserver-bc25:44325/BC/',
    health: 'healthy',
    memoryUsage: '4.2 GB',
    cpuUsage: '12%',
    uptime: '2d 5h',
  };

  const containerB: BCContainer = {
    id: 'def456',
    name: 'bcserver-bc24',
    status: 'stopped',
    image: 'mcr.microsoft.com/businesscentral:24.0',
    created: '2024-01-10T08:00:00Z',
    ports: [
      { privatePort: 443, publicPort: 44324, type: 'tcp' },
      { privatePort: 8080, publicPort: 54524, type: 'tcp' },
    ],
    bcVersion: '24.0',
    health: 'none',
    memoryUsage: undefined,
    cpuUsage: undefined,
    uptime: undefined,
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the comparison modal title', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Container Comparison')).toBeInTheDocument();
    });

    it('should show both container names in the subtitle', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/bcserver-bc25.*vs.*bcserver-bc24/)).toBeInTheDocument();
    });

    it('should render container names as column headers', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      // The names appear in multiple places - in the subtitle and in the table header
      const headings = screen.getAllByText('bcserver-bc25');
      expect(headings.length).toBeGreaterThanOrEqual(1);

      const headingsB = screen.getAllByText('bcserver-bc24');
      expect(headingsB.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Comparison Data', () => {
    it('should display status values', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('stopped')).toBeInTheDocument();
    });

    it('should display BC versions', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('25.0')).toBeInTheDocument();
      expect(screen.getByText('24.0')).toBeInTheDocument();
    });

    it('should display CPU and memory for running container', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('12%')).toBeInTheDocument();
      expect(screen.getByText('4.2 GB')).toBeInTheDocument();
    });

    it('should show N/A for missing stats on stopped container', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      // Multiple N/A values for stopped container's CPU, memory, uptime, health
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should display port mappings', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/44325:443/)).toBeInTheDocument();
      expect(screen.getByText(/44324:443/)).toBeInTheDocument();
    });

    it('should display uptime for running container', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('2d 5h')).toBeInTheDocument();
    });
  });

  describe('Web Client URLs', () => {
    it('should display web client URL for container with one', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('https://bcserver-bc25:44325/BC/')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should display the differences indicator in footer', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Highlighted rows indicate differences/)).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      // Click the Close button in footer
      fireEvent.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      const backdrop = document.querySelector('.bg-black\\/60');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      // The X button is near the header
      const buttons = screen.getAllByRole('button');
      // First button should be the X close button
      const xButton = buttons.find(btn => btn.querySelector('.lucide-x'));
      if (xButton) {
        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Identical Containers', () => {
    it('should handle two identical containers', () => {
      render(
        <ContainerComparison
          containerA={containerA}
          containerB={containerA}
          onClose={mockOnClose}
        />
      );

      // Should render without errors
      expect(screen.getByText('Container Comparison')).toBeInTheDocument();
    });
  });

  describe('Containers with No Ports', () => {
    it('should show "None" for containers without ports', () => {
      const noPortsContainer: BCContainer = {
        ...containerA,
        name: 'no-ports-bc',
        ports: [],
      };

      render(
        <ContainerComparison
          containerA={noPortsContainer}
          containerB={containerB}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('None')).toBeInTheDocument();
    });
  });
});
