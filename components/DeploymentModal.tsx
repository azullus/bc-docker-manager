'use client';

import { useEffect, useRef } from 'react';
import { X, Terminal, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useDeployment } from '@/lib/deployment-context';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeploymentModal({ isOpen, onClose }: DeploymentModalProps) {
  const { deployment, clearDeployment } = useDeployment();
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [deployment.output]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Only allow closing if not running, or confirm
    if (deployment.status === 'running') {
      // Don't close while running - deployment continues in background
    }
    onClose();
  };

  const handleClear = () => {
    if (deployment.status !== 'running') {
      clearDeployment();
      onClose();
    }
  };

  const statusIcon = {
    idle: null,
    running: <Loader2 className="w-5 h-5 animate-spin text-blue-400" />,
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
  };

  const statusText = {
    idle: '',
    running: 'Deploying...',
    success: 'Deployment Complete',
    error: 'Deployment Failed',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <div>
              <h2 className="font-semibold text-white">
                {deployment.containerName ? `Deploying ${deployment.containerName}` : 'Container Deployment'}
              </h2>
              {deployment.version && (
                <p className="text-sm text-gray-400">BC Version: {deployment.version}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {statusIcon[deployment.status]}
              <span className={`text-sm ${
                deployment.status === 'success' ? 'text-green-400' :
                deployment.status === 'error' ? 'text-red-400' :
                deployment.status === 'running' ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {statusText[deployment.status]}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Output */}
        <div
          ref={outputRef}
          className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-sm"
        >
          {deployment.output.length === 0 ? (
            <span className="text-gray-500">No deployment output...</span>
          ) : (
            deployment.output.map((line, i) => (
              <div
                key={i}
                className={`${
                  line.startsWith('✓') || line.includes('SUCCESS')
                    ? 'text-green-400'
                    : line.startsWith('✗') || line.includes('ERROR') || line.includes('error')
                    ? 'text-red-400'
                    : line.includes('WARNING') || line.includes('WARN')
                    ? 'text-yellow-400'
                    : line.startsWith('[DEBUG]')
                    ? 'text-gray-500'
                    : 'text-gray-300'
                }`}
              >
                {line || '\u00A0'}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {deployment.startedAt && (
              <span>Started: {deployment.startedAt.toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex gap-2">
            {deployment.status !== 'running' && (
              <button
                onClick={handleClear}
                className="btn btn-secondary"
              >
                Clear & Close
              </button>
            )}
            <button
              onClick={handleClose}
              className="btn btn-primary"
            >
              {deployment.status === 'running' ? 'Hide (continues in background)' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
