'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { runPowerShell } from '@/lib/electron-api';
import { toast } from 'react-hot-toast';

interface NetworkDiagnosticsProps {
  onComplete?: (output: string[]) => void;
}

export default function NetworkDiagnostics({ onComplete }: NetworkDiagnosticsProps) {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runDiagnostics = async () => {
    setRunning(true);
    toast.loading('Running network diagnostics...', { id: 'diagnostics' });

    try {
      const result = await runPowerShell('scripts/Diagnose-HNS-Ports.ps1', []);
      const lines = result.stdout.split('\n').filter(l => l.trim());

      setOutput(lines);
      setLastRun(new Date());

      if (result.exitCode === 0) {
        toast.success('Diagnostics completed', { id: 'diagnostics' });
        onComplete?.(lines);
      } else {
        toast.error('Diagnostics failed', { id: 'diagnostics' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Diagnostics failed', { id: 'diagnostics' });
    } finally {
      setRunning(false);
    }
  };

  const parseIssues = (lines: string[]): { type: 'error' | 'warning' | 'info'; message: string }[] => {
    const issues: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    const fullText = lines.join('\n');

    // Check for orphaned endpoints
    const orphanedMatch = fullText.match(/Orphaned endpoints.*?:\s*(\d+)/i);
    if (orphanedMatch && parseInt(orphanedMatch[1]) > 0) {
      issues.push({
        type: 'error',
        message: `Found ${orphanedMatch[1]} orphaned HNS endpoints that need cleanup`,
      });
    }

    // Check for NAT mappings
    const natMatch = fullText.match(/BC port mappings:\s*(\d+)/i);
    if (natMatch && parseInt(natMatch[1]) > 0) {
      issues.push({
        type: 'warning',
        message: `Found ${natMatch[1]} NAT static mappings on BC ports (may conflict)`,
      });
    }

    // Check for excluded port ranges
    if (/Excluded ranges overlapping BC ports/i.test(fullText)) {
      issues.push({
        type: 'warning',
        message: 'Windows has excluded port ranges in BC port range (8000-9999)',
      });
    }

    // Check for service status
    if (/Docker.*not.*Running/i.test(fullText)) {
      issues.push({
        type: 'error',
        message: 'Docker service is not running',
      });
    }

    if (/HNS.*not.*Running/i.test(fullText)) {
      issues.push({
        type: 'error',
        message: 'HNS (Host Network Service) is not running',
      });
    }

    // Check for clean state
    if (/No issues detected/i.test(fullText)) {
      issues.push({
        type: 'info',
        message: 'HNS state appears clean - no conflicts detected',
      });
    }

    return issues;
  };

  const issues = output.length > 0 ? parseIssues(output) : [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold">Network Diagnostics</h3>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            running
              ? 'bg-gray-600 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Scan Network
            </>
          )}
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Analyze HNS state to identify orphaned endpoints, NAT mappings, and port conflicts
      </p>

      {lastRun && (
        <div className="text-xs text-gray-500 mb-4">
          Last scan: {lastRun.toLocaleString()}
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-2 mb-4">
          {issues.map((issue, i) => {
            const Icon = issue.type === 'error'
              ? AlertCircle
              : issue.type === 'warning'
              ? AlertCircle
              : issue.type === 'info'
              ? CheckCircle
              : Info;

            const color = issue.type === 'error'
              ? 'text-red-400'
              : issue.type === 'warning'
              ? 'text-yellow-400'
              : 'text-green-400';

            const bg = issue.type === 'error'
              ? 'bg-red-950/30 border-red-500/30'
              : issue.type === 'warning'
              ? 'bg-yellow-950/30 border-yellow-500/30'
              : 'bg-green-950/30 border-green-500/30';

            return (
              <div key={i} className={`p-3 rounded-lg border ${bg}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="text-sm">{issue.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {output.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 font-medium">
            View Full Diagnostic Output ({output.length} lines)
          </summary>
          <div className="mt-3 bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto font-mono text-xs">
            {output.map((line, i) => {
              const isHeader = /^\[.*?\]/.test(line) || /^===/.test(line);
              const isError = /error|failed|not found/i.test(line);
              const isWarning = /warning|orphaned/i.test(line);
              const isSuccess = /✓|success|running|green/i.test(line);

              const color = isError
                ? 'text-red-400'
                : isWarning
                ? 'text-yellow-400'
                : isSuccess
                ? 'text-green-400'
                : isHeader
                ? 'text-cyan-400 font-bold'
                : 'text-gray-300';

              return (
                <div key={i} className={color}>
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {!running && output.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Click &quot;Scan Network&quot; to check for HNS issues</p>
        </div>
      )}
    </div>
  );
}
