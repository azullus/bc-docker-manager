/**
 * HNS Error Detection and Recovery
 *
 * Analyzes PowerShell output to detect HNS-specific errors
 * and provides actionable recovery suggestions.
 */

export interface HNSError {
  type: 'port_conflict' | 'hns_endpoint' | 'nat_mapping' | 'service_failure' | 'unknown';
  message: string;
  errorCode?: string;
  affectedPorts?: number[];
  suggestions: RecoverySuggestion[];
  severity: 'critical' | 'warning' | 'info';
}

export interface RecoverySuggestion {
  action: 'run_fix_script' | 'run_diagnostics' | 'retry_deployment' | 'change_ports' | 'restart_docker' | 'manual_intervention';
  title: string;
  description: string;
  automated?: boolean;
  scriptPath?: string;
  scriptArgs?: string[];
}

/**
 * Known HNS error patterns and their characteristics
 */
const HNS_ERROR_PATTERNS = [
  {
    pattern: /port already exists.*0x803b0013/i,
    type: 'port_conflict' as const,
    severity: 'critical' as const,
    extractPorts: (text: string) => {
      const ports: number[] = [];
      const portMatch = text.match(/port[s]?\s*(\d+)/gi);
      if (portMatch) {
        portMatch.forEach(m => {
          const port = parseInt(m.replace(/\D/g, ''));
          if (port >= 8000 && port <= 9999) ports.push(port);
        });
      }
      return ports;
    },
    suggestions: [
      {
        action: 'run_diagnostics' as const,
        title: 'Run Network Diagnostics',
        description: 'Analyze HNS state to identify orphaned endpoints and port conflicts',
        automated: true,
        scriptPath: 'scripts/Diagnose-HNS-Ports.ps1',
      },
      {
        action: 'run_fix_script' as const,
        title: 'Clean HNS State',
        description: 'Remove orphaned endpoints and NAT mappings, then restart services',
        automated: true,
        scriptPath: 'scripts/Fix-HNS-State.ps1',
      },
      {
        action: 'retry_deployment' as const,
        title: 'Retry Deployment',
        description: 'After cleanup, retry the container deployment',
        automated: true,
      },
    ],
  },
  {
    pattern: /failed to create endpoint.*on network/i,
    type: 'hns_endpoint' as const,
    severity: 'critical' as const,
    suggestions: [
      {
        action: 'run_diagnostics' as const,
        title: 'Run Network Diagnostics',
        description: 'Check for orphaned HNS endpoints',
        automated: true,
        scriptPath: 'scripts/Diagnose-HNS-Ports.ps1',
      },
      {
        action: 'run_fix_script' as const,
        title: 'Clean HNS Endpoints',
        description: 'Remove all orphaned endpoints and restart HNS service',
        automated: true,
        scriptPath: 'scripts/Fix-HNS-State.ps1',
      },
    ],
  },
  {
    pattern: /nat.*mapping.*already.*exists/i,
    type: 'nat_mapping' as const,
    severity: 'critical' as const,
    suggestions: [
      {
        action: 'run_fix_script' as const,
        title: 'Clear NAT Mappings',
        description: 'Remove conflicting NAT static mappings in BC port range',
        automated: true,
        scriptPath: 'scripts/Fix-HNS-State.ps1',
      },
    ],
  },
  {
    pattern: /host network service|hns.*not.*running|hns.*service/i,
    type: 'service_failure' as const,
    severity: 'critical' as const,
    suggestions: [
      {
        action: 'restart_docker' as const,
        title: 'Restart HNS and Docker',
        description: 'Restart the Host Network Service and Docker Engine',
        automated: true,
        scriptPath: 'scripts/Fix-HNS-State.ps1',
      },
    ],
  },
  {
    pattern: /docker.*not.*running|cannot connect.*docker/i,
    type: 'service_failure' as const,
    severity: 'critical' as const,
    suggestions: [
      {
        action: 'restart_docker' as const,
        title: 'Start Docker Service',
        description: 'Ensure Docker Desktop is running and responsive',
        automated: false,
      },
    ],
  },
];

/**
 * Analyze PowerShell output for HNS-specific errors
 */
export function detectHNSError(output: string[]): HNSError | null {
  const fullOutput = output.join('\n');

  for (const pattern of HNS_ERROR_PATTERNS) {
    if (pattern.pattern.test(fullOutput)) {
      const affectedPorts = pattern.extractPorts?.(fullOutput) || [];

      return {
        type: pattern.type,
        message: extractErrorMessage(fullOutput, pattern.pattern),
        errorCode: extractErrorCode(fullOutput),
        affectedPorts: affectedPorts.length > 0 ? affectedPorts : undefined,
        suggestions: pattern.suggestions,
        severity: pattern.severity,
      };
    }
  }

  // Check for generic errors that might be HNS-related
  if (/error|failed|exception/i.test(fullOutput) && /port|network|nat|hns/i.test(fullOutput)) {
    return {
      type: 'unknown',
      message: extractErrorMessage(fullOutput),
      suggestions: [
        {
          action: 'run_diagnostics',
          title: 'Run Network Diagnostics',
          description: 'Analyze the network state to identify the issue',
          automated: true,
          scriptPath: 'scripts/Diagnose-HNS-Ports.ps1',
        },
      ],
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Extract the most relevant error message from output
 */
function extractErrorMessage(output: string, pattern?: RegExp): string {
  const lines = output.split('\n').filter(l => l.trim());

  // Find lines with ERROR, FAILED, or Exception
  const errorLines = lines.filter(l =>
    /error|failed|exception/i.test(l) &&
    !/\[debug\]/i.test(l) &&
    l.length > 10
  );

  if (errorLines.length > 0) {
    // If we have a pattern, prioritize lines matching it
    if (pattern) {
      const matchingLine = errorLines.find(l => pattern.test(l));
      if (matchingLine) {
        return matchingLine.trim().replace(/^\[.*?\]\s*/, '');
      }
    }

    // Return the first substantial error line
    return errorLines[0].trim().replace(/^\[.*?\]\s*/, '');
  }

  // Fallback to last non-empty line
  return lines[lines.length - 1]?.trim() || 'Deployment failed';
}

/**
 * Extract Windows error code if present (e.g., 0x803b0013)
 */
function extractErrorCode(output: string): string | undefined {
  const match = output.match(/0x[0-9a-f]{8}/i);
  return match?.[0];
}

/**
 * Get user-friendly description of HNS error type
 */
export function getErrorTypeDescription(type: HNSError['type']): string {
  switch (type) {
    case 'port_conflict':
      return 'Port Conflict';
    case 'hns_endpoint':
      return 'HNS Endpoint Error';
    case 'nat_mapping':
      return 'NAT Mapping Conflict';
    case 'service_failure':
      return 'Service Failure';
    case 'unknown':
      return 'Network Error';
  }
}

/**
 * Get severity color class for UI
 */
export function getSeverityColor(severity: HNSError['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'info':
      return 'text-blue-400';
  }
}

/**
 * Format ports list for display
 */
export function formatPorts(ports?: number[]): string {
  if (!ports || ports.length === 0) return 'Unknown ports';
  if (ports.length === 1) return `Port ${ports[0]}`;
  return `Ports ${ports.join(', ')}`;
}
