'use client';

import { X, Container, Cpu, HardDrive, Clock, Network, Image as ImageIcon } from 'lucide-react';
import { BCContainer } from '@/lib/types';

interface ContainerComparisonProps {
  containerA: BCContainer;
  containerB: BCContainer;
  onClose: () => void;
}

interface ComparisonRow {
  label: string;
  icon: React.ReactNode;
  valueA: string;
  valueB: string;
  highlight?: 'same' | 'different';
}

export default function ContainerComparison({ containerA, containerB, onClose }: ContainerComparisonProps) {
  const formatPorts = (container: BCContainer): string => {
    if (container.ports.length === 0) return 'None';
    return container.ports
      .map(p => `${p.publicPort}:${p.privatePort}/${p.type}`)
      .join(', ');
  };

  const rows: ComparisonRow[] = [
    {
      label: 'Status',
      icon: <Container className="w-4 h-4" />,
      valueA: containerA.status,
      valueB: containerB.status,
      highlight: containerA.status === containerB.status ? 'same' : 'different',
    },
    {
      label: 'BC Version',
      icon: <ImageIcon className="w-4 h-4" />,
      valueA: containerA.bcVersion || 'N/A',
      valueB: containerB.bcVersion || 'N/A',
      highlight: containerA.bcVersion === containerB.bcVersion ? 'same' : 'different',
    },
    {
      label: 'Image',
      icon: <ImageIcon className="w-4 h-4" />,
      valueA: containerA.image.split('/').pop() || containerA.image,
      valueB: containerB.image.split('/').pop() || containerB.image,
      highlight: containerA.image === containerB.image ? 'same' : 'different',
    },
    {
      label: 'Health',
      icon: <Container className="w-4 h-4" />,
      valueA: containerA.health || 'N/A',
      valueB: containerB.health || 'N/A',
      highlight: containerA.health === containerB.health ? 'same' : 'different',
    },
    {
      label: 'CPU Usage',
      icon: <Cpu className="w-4 h-4" />,
      valueA: containerA.cpuUsage || 'N/A',
      valueB: containerB.cpuUsage || 'N/A',
    },
    {
      label: 'Memory Usage',
      icon: <HardDrive className="w-4 h-4" />,
      valueA: containerA.memoryUsage || 'N/A',
      valueB: containerB.memoryUsage || 'N/A',
    },
    {
      label: 'Uptime',
      icon: <Clock className="w-4 h-4" />,
      valueA: containerA.uptime || 'N/A',
      valueB: containerB.uptime || 'N/A',
    },
    {
      label: 'Ports',
      icon: <Network className="w-4 h-4" />,
      valueA: formatPorts(containerA),
      valueB: formatPorts(containerB),
      highlight: formatPorts(containerA) === formatPorts(containerB) ? 'same' : 'different',
    },
    {
      label: 'Created',
      icon: <Clock className="w-4 h-4" />,
      valueA: containerA.created ? new Date(containerA.created).toLocaleDateString() : 'N/A',
      valueB: containerB.created ? new Date(containerB.created).toLocaleDateString() : 'N/A',
    },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'stopped':
      case 'exited': return 'text-red-400';
      case 'paused': return 'text-yellow-400';
      case 'restarting': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const healthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-red-400';
      case 'starting': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatValue = (label: string, value: string) => {
    if (label === 'Status') {
      return <span className={statusColor(value)}>{value}</span>;
    }
    if (label === 'Health') {
      return <span className={healthColor(value)}>{value}</span>;
    }
    return value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Container className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Container Comparison</h2>
              <p className="text-sm text-gray-400">
                Comparing {containerA.name} vs {containerB.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-1/4">Property</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-blue-400 w-[37.5%]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${containerA.status === 'running' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {containerA.name}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-purple-400 w-[37.5%]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${containerB.status === 'running' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {containerB.name}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`border-b border-gray-700/50 ${
                    row.highlight === 'different' ? 'bg-yellow-500/5' : ''
                  } hover:bg-gray-700/30 transition-colors`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {row.icon}
                      {row.label}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {formatValue(row.label, row.valueA)}
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {formatValue(row.label, row.valueB)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Web Client URLs */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {containerA.webClientUrl && (
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{containerA.name} Web Client</p>
                <a
                  href={containerA.webClientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline break-all"
                >
                  {containerA.webClientUrl}
                </a>
              </div>
            )}
            {containerB.webClientUrl && (
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{containerB.name} Web Client</p>
                <a
                  href={containerB.webClientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:underline break-all"
                >
                  {containerB.webClientUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-3 h-1 bg-yellow-500/30 rounded" />
              Highlighted rows indicate differences
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
