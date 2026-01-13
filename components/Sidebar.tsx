'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Container,
  HardDrive,
  MessageCircle,
  Settings,
  Activity,
  PlusCircle,
  AlertCircle,
  Terminal,
  Loader2,
  CheckCircle,
  XCircle,
  Box,
} from 'lucide-react';
import { isElectron, getDockerInfo } from '@/lib/electron-api';
import { useDeployment } from '@/lib/deployment-context';
import DeploymentModal from '@/components/DeploymentModal';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Docker Setup', href: '/setup', icon: Box },
  { name: 'Create Container', href: '/create', icon: PlusCircle, electronOnly: true },
  { name: 'Backups', href: '/backups', icon: HardDrive },
  { name: 'Troubleshoot', href: '/troubleshoot', icon: MessageCircle },
  { name: 'Settings', href: '/settings', icon: Settings, electronOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isElectronApp, setIsElectronApp] = useState(false);
  const [dockerStatus, setDockerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const { deployment, isDeploying } = useDeployment();

  useEffect(() => {
    setIsElectronApp(isElectron());

    // Check Docker connection
    const checkDocker = async () => {
      try {
        await getDockerInfo();
        setDockerStatus('connected');
      } catch {
        setDockerStatus('disconnected');
      }
    };

    checkDocker();
    const interval = setInterval(checkDocker, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredNav = navigation.filter(
    (item) => !item.electronOnly || isElectronApp
  );

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Container className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">BC Docker</h1>
            <p className="text-xs text-gray-400">
              {isElectronApp ? 'Desktop' : 'Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Deployment Status (when active) */}
      {deployment.status !== 'idle' && (
        <div className="absolute bottom-20 left-4 right-4">
          <button
            onClick={() => setShowDeploymentModal(true)}
            className={`w-full card p-3 cursor-pointer transition-colors hover:border-blue-500 ${
              isDeploying ? 'border-blue-500/50 bg-blue-500/10' :
              deployment.status === 'success' ? 'border-green-500/50 bg-green-500/10' :
              deployment.status === 'error' ? 'border-red-500/50 bg-red-500/10' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {isDeploying ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : deployment.status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {deployment.containerName || 'Deployment'}
                </p>
                <p className="text-xs text-gray-400">
                  {isDeploying ? 'In progress...' :
                   deployment.status === 'success' ? 'Complete' : 'Failed'}
                </p>
              </div>
              <Terminal className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </div>
      )}

      {/* Docker Status indicator */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="card p-3">
          <div className="flex items-center gap-2">
            {dockerStatus === 'connected' ? (
              <>
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Docker Connected</span>
              </>
            ) : dockerStatus === 'disconnected' ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-300">Docker Disconnected</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-sm text-gray-300">Checking...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Deployment Modal */}
      <DeploymentModal
        isOpen={showDeploymentModal}
        onClose={() => setShowDeploymentModal(false)}
      />
    </aside>
  );
}
