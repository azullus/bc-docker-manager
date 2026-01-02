'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Search, Filter } from 'lucide-react';
import { ContainerLog } from '@/lib/types';

interface LogViewerProps {
  logs: ContainerLog[];
  onRefresh: () => void;
  loading?: boolean;
}

export default function LogViewer({ logs, onRefresh, loading }: LogViewerProps) {
  const [filter, setFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesStream = streamFilter === 'all' || log.stream === streamFilter;
    const matchesFilter = !filter || log.message.toLowerCase().includes(filter.toLowerCase());
    return matchesStream && matchesFilter;
  });

  const handleDownload = () => {
    const content = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.stream}] ${log.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `container-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="card-title">Container Logs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-ghost p-2"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-ghost p-2"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value as 'all' | 'stdout' | 'stderr')}
            className="input"
          >
            <option value="all">All</option>
            <option value="stdout">stdout</option>
            <option value="stderr">stderr</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto"
        style={{ maxHeight: '500px' }}
      >
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {logs.length === 0 ? 'No logs available' : 'No matching logs'}
          </p>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`flex gap-2 py-0.5 hover:bg-gray-800 ${
                log.stream === 'stderr' ? 'log-stderr' : 'log-stdout'
              }`}
            >
              <span className="text-gray-500 shrink-0">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className="text-gray-600 shrink-0">
                [{log.stream}]
              </span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {filteredLogs.length} of {logs.length} log entries
        </span>
        {streamFilter !== 'all' && (
          <span>Filtered by: {streamFilter}</span>
        )}
      </div>
    </div>
  );
}
