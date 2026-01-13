'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Wrench,
  Search,
  RotateCw,
  Play,
  Loader2,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { runPowerShell } from '@/lib/electron-api';
import { toast } from 'react-hot-toast';
import {
  HNSError,
  RecoverySuggestion,
  getErrorTypeDescription,
  getSeverityColor,
  formatPorts,
} from '@/lib/hns-error-detector';

interface HNSErrorRecoveryProps {
  error: HNSError;
  onRetry: () => void;
  onDiagnosticsComplete?: (output: string[]) => void;
}

export default function HNSErrorRecovery({ error, onRetry, onDiagnosticsComplete }: HNSErrorRecoveryProps) {
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [actionOutput, setActionOutput] = useState<Record<string, string[]>>({});

  const handleRunAction = async (suggestion: RecoverySuggestion) => {
    const actionKey = suggestion.title;

    if (runningAction) {
      toast.error('Please wait for the current action to complete');
      return;
    }

    setRunningAction(actionKey);
    const output: string[] = [];

    try {
      switch (suggestion.action) {
        case 'run_diagnostics':
          if (suggestion.scriptPath) {
            toast.loading('Running diagnostics...', { id: 'diagnostics' });
            const result = await runPowerShell(suggestion.scriptPath, suggestion.scriptArgs || []);
            output.push(...result.stdout.split('\n'));
            if (result.stderr) output.push('STDERR:', ...result.stderr.split('\n'));

            if (result.exitCode === 0) {
              toast.success('Diagnostics completed', { id: 'diagnostics' });
              setCompletedActions(prev => new Set(Array.from(prev).concat(actionKey)));
              onDiagnosticsComplete?.(output);
            } else {
              toast.error('Diagnostics failed', { id: 'diagnostics' });
            }
          }
          break;

        case 'run_fix_script':
          if (suggestion.scriptPath) {
            toast.loading('Cleaning HNS state...', { id: 'fix' });
            const result = await runPowerShell(suggestion.scriptPath, ['-Force', ...(suggestion.scriptArgs || [])]);
            output.push(...result.stdout.split('\n'));
            if (result.stderr) output.push('STDERR:', ...result.stderr.split('\n'));

            if (result.exitCode === 0) {
              toast.success('HNS state cleaned successfully', { id: 'fix' });
              setCompletedActions(prev => new Set(Array.from(prev).concat(actionKey)));
            } else {
              toast.error('Cleanup failed - check output for details', { id: 'fix' });
            }
          }
          break;

        case 'retry_deployment':
          toast.success('Ready to retry deployment');
          setCompletedActions(prev => new Set(Array.from(prev).concat(actionKey)));
          onRetry();
          break;

        case 'restart_docker':
          toast('Please restart Docker Desktop manually', { icon: '⚠️' });
          break;

        case 'change_ports':
          toast('Consider using different ports in the deployment configuration', { icon: '💡' });
          break;

        case 'manual_intervention':
          toast('Manual intervention required - see suggestions', { icon: '🔧' });
          break;
      }

      if (output.length > 0) {
        setActionOutput(prev => ({ ...prev, [actionKey]: output }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setRunningAction(null);
    }
  };

  const getActionIcon = (action: RecoverySuggestion['action']) => {
    switch (action) {
      case 'run_diagnostics':
        return Search;
      case 'run_fix_script':
        return Wrench;
      case 'retry_deployment':
        return Play;
      case 'restart_docker':
        return RotateCw;
      default:
        return ChevronRight;
    }
  };

  return (
    <div className="card p-6 border-2 border-red-500/30 bg-red-950/20">
      <div className="flex items-start gap-4">
        <AlertTriangle className={`w-8 h-8 flex-shrink-0 ${getSeverityColor(error.severity)}`} />
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">
            {getErrorTypeDescription(error.type)} Detected
          </h3>

          <p className="text-gray-300 mb-4">{error.message}</p>

          {error.errorCode && (
            <div className="inline-block bg-gray-800 px-3 py-1 rounded text-sm font-mono text-gray-400 mb-4">
              Error Code: {error.errorCode}
            </div>
          )}

          {error.affectedPorts && (
            <div className="mb-4 text-sm text-gray-400">
              {formatPorts(error.affectedPorts)}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold text-blue-400">Recommended Actions:</h4>

            {error.suggestions.map((suggestion, index) => {
              const Icon = getActionIcon(suggestion.action);
              const isRunning = runningAction === suggestion.title;
              const isCompleted = completedActions.has(suggestion.title);
              const hasOutput = actionOutput[suggestion.title];

              return (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{suggestion.title}</h5>
                        {suggestion.automated && (
                          <button
                            onClick={() => handleRunAction(suggestion)}
                            disabled={isRunning || isCompleted}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                              isCompleted
                                ? 'bg-green-600/20 text-green-400 cursor-default'
                                : isRunning
                                ? 'bg-gray-600 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isRunning ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Running...
                              </>
                            ) : isCompleted ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Completed
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Run Now
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{suggestion.description}</p>

                      {hasOutput && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                            View Output ({hasOutput.length} lines)
                          </summary>
                          <div className="mt-2 bg-gray-900 rounded p-3 max-h-64 overflow-auto font-mono text-xs">
                            {hasOutput.map((line, i) => (
                              <div key={i} className="text-gray-300">
                                {line || '\u00A0'}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error.type === 'port_conflict' && (
            <div className="mt-6 p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg">
              <h5 className="font-semibold text-blue-400 mb-2">Understanding Port Conflicts</h5>
              <p className="text-sm text-gray-400">
                Windows HNS (Host Network Service) maintains NAT port mappings for Docker containers.
                When a container is removed improperly, these mappings can persist, causing &quot;port already exists&quot;
                errors during new deployments. The cleanup script removes these orphaned mappings.
              </p>
            </div>
          )}

          {error.type === 'hns_endpoint' && (
            <div className="mt-6 p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg">
              <h5 className="font-semibold text-blue-400 mb-2">Understanding HNS Endpoints</h5>
              <p className="text-sm text-gray-400">
                HNS endpoints are network interfaces for containers. Orphaned endpoints (from improperly
                removed containers) can prevent new containers from creating network connections. Cleaning
                these endpoints allows Docker to recreate them properly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
