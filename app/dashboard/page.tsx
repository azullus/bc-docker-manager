'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Container, Activity, HardDrive, AlertCircle, RefreshCw } from 'lucide-react';
import ContainerCard from '@/components/ContainerCard';
import { BCContainer, DashboardStats } from '@/lib/types';
import { listContainers, containerAction, listBackups } from '@/lib/electron-api';

export default function DashboardPage() {
  const [containers, setContainers] = useState<BCContainer[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      setError(null);
      const data = await listContainers();

      setContainers(data);

      // Calculate stats
      const running = data.filter((c: BCContainer) => c.status === 'running').length;
      const stopped = data.filter((c: BCContainer) => c.status !== 'running').length;
      const healthy = data.filter((c: BCContainer) => c.health === 'healthy').length;

      // Fetch backup count
      let backupCount = 0;
      try {
        const backups = await listBackups();
        backupCount = backups.length;
      } catch {
        // Ignore backup fetch errors for stats display
      }

      setStats({
        totalContainers: data.length,
        runningContainers: running,
        stoppedContainers: stopped,
        totalBackups: backupCount,
        healthyContainers: healthy,
        unhealthyContainers: data.length - healthy,
      });
    } catch {
      setError('Failed to connect to Docker. Is Docker running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const handleContainerAction = useCallback(async (action: 'start' | 'stop' | 'restart' | 'remove', containerId: string) => {
    try {
      await containerAction(containerId, action);
      // Refresh container list
      await fetchContainers();
    } catch (err) {
      toast.error(`Action failed: ${(err as Error).message}`);
    }
  }, [fetchContainers]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">BC Containers</h1>
          <p className="text-gray-400">Manage your Business Central Docker containers</p>
        </div>
        <button
          onClick={fetchContainers}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Container className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalContainers}</p>
                <p className="text-sm text-gray-400">Total Containers</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.runningContainers}</p>
                <p className="text-sm text-gray-400">Running</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
                <Container className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.stoppedContainers}</p>
                <p className="text-sm text-gray-400">Stopped</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalBackups}</p>
                <p className="text-sm text-gray-400">Backups</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card border-red-500/50 bg-red-500/10 mb-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && containers.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading containers...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && containers.length === 0 && !error && (
        <div className="card text-center py-12">
          <Container className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No BC Containers Found</h3>
          <p className="text-gray-400 mb-4">
            No containers matching the bcserver-* naming convention were found.
          </p>
          <p className="text-sm text-gray-500">
            Create a container using Install-BC-Helper.ps1 or Install-BC-Latest.ps1
          </p>
        </div>
      )}

      {/* Container Grid */}
      {containers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {containers.map((container) => (
            <ContainerCard
              key={container.id}
              container={container}
              onAction={handleContainerAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
