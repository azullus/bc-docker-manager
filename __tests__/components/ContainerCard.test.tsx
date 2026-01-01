import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContainerCard from '@/components/ContainerCard';
import { BCContainer } from '@/lib/types';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('ContainerCard', () => {
  const mockContainer: BCContainer = {
    id: 'abc123',
    name: 'bcserver-bc25',
    status: 'running',
    image: 'mcr.microsoft.com/businesscentral:latest',
    ports: [
      { privatePort: 8080, publicPort: 54525, type: 'tcp' },
      { privatePort: 443, publicPort: 44325, type: 'tcp' },
    ],
    bcVersion: '25.0',
    webClientUrl: 'https://bcserver-bc25/BC/',
    health: 'healthy',
    memoryUsage: '4.2 GB',
    cpuUsage: '12%',
    uptime: '2 days',
    created: new Date().toISOString(),
  };

  const mockOnAction = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  describe('Rendering', () => {
    it('should render container name', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('bcserver-bc25')).toBeInTheDocument();
    });

    it('should render BC version', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('BC 25.0')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    it('should render stats for running container', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('12%')).toBeInTheDocument();
      expect(screen.getByText('4.2 GB')).toBeInTheDocument();
      expect(screen.getByText('2 days')).toBeInTheDocument();
    });

    it('should not render stats for stopped container', () => {
      const stoppedContainer = { ...mockContainer, status: 'stopped' as const };
      render(<ContainerCard container={stoppedContainer} onAction={mockOnAction} />);
      expect(screen.queryByText('12%')).not.toBeInTheDocument();
    });

    it('should render port mappings', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('54525:8080')).toBeInTheDocument();
      expect(screen.getByText('44325:443')).toBeInTheDocument();
    });

    it('should render link to container details', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      const detailsLink = screen.getByText('Details');
      expect(detailsLink.closest('a')).toHaveAttribute('href', '/container?id=abc123');
    });
  });

  describe('Running Container Actions', () => {
    it('should render Stop button for running container', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should render Restart button for running container', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });

    it('should render Open BC link for running container with webClientUrl', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      const openBCLink = screen.getByText('Open BC');
      expect(openBCLink.closest('a')).toHaveAttribute('href', 'https://bcserver-bc25/BC/');
    });

    it('should call onAction with stop when Stop is clicked', async () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      fireEvent.click(screen.getByText('Stop'));

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('stop', 'abc123');
      });
    });

    it('should call onAction with restart when Restart is clicked', async () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      fireEvent.click(screen.getByText('Restart'));

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('restart', 'abc123');
      });
    });

    it('should show loading state when action is in progress', async () => {
      // Make the action take time
      mockOnAction.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      fireEvent.click(screen.getByText('Stop'));

      expect(screen.getByText('Stopping...')).toBeInTheDocument();
    });
  });

  describe('Stopped Container Actions', () => {
    const stoppedContainer = { ...mockContainer, status: 'stopped' as const };

    it('should render Start button for stopped container', () => {
      render(<ContainerCard container={stoppedContainer} onAction={mockOnAction} />);
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('should not render Stop or Restart buttons for stopped container', () => {
      render(<ContainerCard container={stoppedContainer} onAction={mockOnAction} />);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
      expect(screen.queryByText('Restart')).not.toBeInTheDocument();
    });

    it('should not render Open BC link for stopped container', () => {
      render(<ContainerCard container={stoppedContainer} onAction={mockOnAction} />);
      expect(screen.queryByText('Open BC')).not.toBeInTheDocument();
    });

    it('should call onAction with start when Start is clicked', async () => {
      render(<ContainerCard container={stoppedContainer} onAction={mockOnAction} />);
      fireEvent.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('start', 'abc123');
      });
    });
  });

  describe('Menu Actions', () => {
    it('should toggle menu visibility when more button is clicked', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);

      // Menu should not be visible initially
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();

      // Click the menu button (MoreVertical icon button)
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.className.includes('btn-ghost'));
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      // Menu should now be visible
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should call onAction with remove when Remove is clicked', async () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);

      // Open menu first
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.className.includes('btn-ghost'));
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      // Click remove
      fireEvent.click(screen.getByText('Remove'));

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('remove', 'abc123');
      });
    });
  });

  describe('Port Display', () => {
    it('should show +N more when more than 3 ports', () => {
      const manyPortsContainer = {
        ...mockContainer,
        ports: [
          { privatePort: 8080, publicPort: 54525, type: 'tcp' },
          { privatePort: 443, publicPort: 44325, type: 'tcp' },
          { privatePort: 7049, publicPort: 8025, type: 'tcp' },
          { privatePort: 7047, publicPort: 7047, type: 'tcp' },
          { privatePort: 7048, publicPort: 7048, type: 'tcp' },
        ],
      };

      render(<ContainerCard container={manyPortsContainer} onAction={mockOnAction} />);
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should not show +N more with 3 or fewer ports', () => {
      render(<ContainerCard container={mockContainer} onAction={mockOnAction} />);
      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });
  });

  describe('Image Fallback', () => {
    it('should show image name when bcVersion is not available', () => {
      const noBCVersion = { ...mockContainer, bcVersion: undefined };
      render(<ContainerCard container={noBCVersion} onAction={mockOnAction} />);
      expect(screen.getByText('businesscentral:latest')).toBeInTheDocument();
    });
  });
});
