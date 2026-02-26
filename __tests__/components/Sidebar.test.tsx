import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

// Override the default pathname mock for this test file
let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => mockPathname,
  useParams: () => ({}),
}));

// Mock electron-api
jest.mock('@/lib/electron-api', () => ({
  isElectron: jest.fn(() => false),
  getDockerInfo: jest.fn(),
}));

// Mock deployment context
jest.mock('@/lib/deployment-context', () => ({
  useDeployment: () => ({
    deployment: {
      status: 'idle',
      containerName: null,
      version: null,
      output: [],
      startedAt: null,
    },
    isDeploying: false,
  }),
}));

// Mock DeploymentModal so it does not interfere
jest.mock('@/components/DeploymentModal', () => {
  return function MockDeploymentModal() {
    return null;
  };
});

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

import { isElectron, getDockerInfo } from '@/lib/electron-api';

const mockIsElectron = isElectron as jest.MockedFunction<typeof isElectron>;
const mockGetDockerInfo = getDockerInfo as jest.MockedFunction<typeof getDockerInfo>;

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsElectron.mockReturnValue(false);
    mockGetDockerInfo.mockResolvedValue({
      version: '24.0.0',
      containers: 5,
      running: 3,
    });
    mockPathname = '/dashboard';
  });

  describe('Rendering', () => {
    it('should render the app logo and title', () => {
      render(<Sidebar />);
      expect(screen.getByText('BC Docker')).toBeInTheDocument();
    });

    it('should render the subtitle for web mode', () => {
      mockIsElectron.mockReturnValue(false);
      render(<Sidebar />);
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('should render web-mode navigation items', () => {
      mockIsElectron.mockReturnValue(false);
      render(<Sidebar />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Docker Setup')).toBeInTheDocument();
      expect(screen.getByText('Backups')).toBeInTheDocument();
      expect(screen.getByText('Troubleshoot')).toBeInTheDocument();
    });

    it('should not render electron-only items in web mode', () => {
      mockIsElectron.mockReturnValue(false);
      render(<Sidebar />);

      expect(screen.queryByText('Create Container')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight the Dashboard link when on /dashboard', () => {
      mockPathname = '/dashboard';
      render(<Sidebar />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('active');
    });

    it('should highlight the Troubleshoot link when on /troubleshoot', () => {
      mockPathname = '/troubleshoot';
      render(<Sidebar />);

      const troubleshootLink = screen.getByText('Troubleshoot').closest('a');
      expect(troubleshootLink).toHaveClass('active');
    });

    it('should not highlight Dashboard when on another page', () => {
      mockPathname = '/settings';
      render(<Sidebar />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).not.toHaveClass('active');
    });
  });

  describe('Docker Status', () => {
    it('should show "Checking..." initially', () => {
      render(<Sidebar />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('should show "Docker Connected" after successful check', async () => {
      mockGetDockerInfo.mockResolvedValue({
        version: '24.0.0',
        containers: 5,
        running: 3,
      });

      render(<Sidebar />);

      await waitFor(() => {
        expect(screen.getByText('Docker Connected')).toBeInTheDocument();
      });
    });

    it('should show "Docker Disconnected" after failed check', async () => {
      mockGetDockerInfo.mockRejectedValue(new Error('Connection failed'));

      render(<Sidebar />);

      await waitFor(() => {
        expect(screen.getByText('Docker Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('should have correct hrefs for all navigation items', () => {
      render(<Sidebar />);

      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
      expect(screen.getByText('Docker Setup').closest('a')).toHaveAttribute('href', '/setup');
      expect(screen.getByText('Backups').closest('a')).toHaveAttribute('href', '/backups');
      expect(screen.getByText('Troubleshoot').closest('a')).toHaveAttribute('href', '/troubleshoot');
    });
  });
});
