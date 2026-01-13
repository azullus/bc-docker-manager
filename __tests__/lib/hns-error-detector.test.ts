import {
  detectHNSError,
  getErrorTypeDescription,
  getSeverityColor,
  formatPorts,
  HNSError,
} from '@/lib/hns-error-detector';

describe('HNS Error Detector', () => {
  describe('detectHNSError', () => {
    describe('Port Conflict Detection', () => {
      it('should detect port already exists error with code 0x803b0013', () => {
        const output = [
          '[INFO] Starting deployment...',
          '[ERROR] port already exists (0x803b0013)',
          'Failed to create container',
        ];

        const error = detectHNSError(output);

        expect(error).not.toBeNull();
        expect(error?.type).toBe('port_conflict');
        expect(error?.severity).toBe('critical');
        expect(error?.errorCode).toBe('0x803b0013');
        expect(error?.suggestions.length).toBeGreaterThan(0);
      });

      it('should extract port numbers from error message', () => {
        const output = [
          '[ERROR] port already exists (0x803b0013) - port 8080 is in use',
          'Additional error on port 8443',
        ];

        const error = detectHNSError(output);

        expect(error?.affectedPorts).toContain(8080);
        expect(error?.affectedPorts).toContain(8443);
      });

      it('should only extract ports in BC range (8000-9999)', () => {
        const output = [
          '[ERROR] port already exists (0x803b0013) - port 80 is blocked, port 8080 conflict',
        ];

        const error = detectHNSError(output);

        expect(error?.affectedPorts).toContain(8080);
        expect(error?.affectedPorts).not.toContain(80);
      });

      it('should handle case-insensitive matching', () => {
        const output = ['[ERROR] PORT ALREADY EXISTS (0X803B0013)'];

        const error = detectHNSError(output);

        expect(error?.type).toBe('port_conflict');
      });
    });

    describe('HNS Endpoint Error Detection', () => {
      it('should detect failed to create endpoint error', () => {
        const output = [
          '[INFO] Creating container...',
          '[ERROR] failed to create endpoint bcserver-latest on network nat',
          'Container creation aborted',
        ];

        const error = detectHNSError(output);

        expect(error).not.toBeNull();
        expect(error?.type).toBe('hns_endpoint');
        expect(error?.severity).toBe('critical');
      });

      it('should provide endpoint cleanup suggestions', () => {
        const output = ['failed to create endpoint container1 on network bridge'];

        const error = detectHNSError(output);

        expect(error?.suggestions.some(s => s.action === 'run_diagnostics')).toBe(true);
        expect(error?.suggestions.some(s => s.action === 'run_fix_script')).toBe(true);
      });
    });

    describe('NAT Mapping Conflict Detection', () => {
      it('should detect nat mapping already exists error', () => {
        const output = [
          '[ERROR] nat mapping already exists for port 8080',
        ];

        const error = detectHNSError(output);

        expect(error?.type).toBe('nat_mapping');
        expect(error?.severity).toBe('critical');
      });

      it('should suggest clearing NAT mappings', () => {
        const output = ['NAT static mapping already exists'];

        const error = detectHNSError(output);

        expect(error?.suggestions.some(s =>
          s.action === 'run_fix_script' && s.title.toLowerCase().includes('nat')
        )).toBe(true);
      });
    });

    describe('Service Failure Detection', () => {
      it('should detect HNS service not running', () => {
        const output = [
          '[ERROR] host network service not running',
        ];

        const error = detectHNSError(output);

        expect(error?.type).toBe('service_failure');
        expect(error?.severity).toBe('critical');
      });

      it('should detect Docker not running', () => {
        const output = [
          '[ERROR] Cannot connect to Docker daemon',
          'docker is not running',
        ];

        const error = detectHNSError(output);

        expect(error?.type).toBe('service_failure');
      });

      it('should suggest restart for service failures', () => {
        const output = ['HNS service failure'];

        const error = detectHNSError(output);

        expect(error?.suggestions.some(s => s.action === 'restart_docker')).toBe(true);
      });
    });

    describe('Unknown/Generic Error Detection', () => {
      it('should detect generic network errors', () => {
        const output = [
          '[ERROR] Failed to configure network for container',
          'Port allocation error',
        ];

        const error = detectHNSError(output);

        expect(error).not.toBeNull();
        expect(error?.type).toBe('unknown');
        expect(error?.severity).toBe('warning');
      });

      it('should return null for non-HNS errors', () => {
        const output = [
          '[INFO] Container started successfully',
          'All good',
        ];

        const error = detectHNSError(output);

        expect(error).toBeNull();
      });

      it('should return null for empty output', () => {
        const error = detectHNSError([]);

        expect(error).toBeNull();
      });

      it('should suggest diagnostics for unknown errors', () => {
        const output = ['[ERROR] network port failed'];

        const error = detectHNSError(output);

        expect(error?.suggestions.some(s => s.action === 'run_diagnostics')).toBe(true);
      });
    });

    describe('Error Message Extraction', () => {
      it('should extract meaningful error message', () => {
        const output = [
          '[INFO] Starting...',
          '[DEBUG] Some debug info',
          '[ERROR] port already exists (0x803b0013): Cannot bind to port 8080',
          '[INFO] Cleanup complete',
        ];

        const error = detectHNSError(output);

        expect(error?.message).toContain('port');
        expect(error?.message).not.toContain('[DEBUG]');
      });

      it('should handle multi-line output', () => {
        const output = [
          'Line 1',
          'Line 2',
          '[ERROR] port already exists (0x803b0013)',
          'Line 4',
        ];

        const error = detectHNSError(output);

        expect(error).not.toBeNull();
        expect(error?.message.length).toBeGreaterThan(0);
      });
    });

    describe('Error Code Extraction', () => {
      it('should extract Windows error code', () => {
        // Must match an HNS pattern to return an error object
        const output = ['port already exists Error code: 0x803b0013'];

        const error = detectHNSError(output);

        expect(error?.errorCode).toBe('0x803b0013');
      });

      it('should handle uppercase error codes', () => {
        const output = ['port already exists (0X803B0013)'];

        const error = detectHNSError(output);

        expect(error?.errorCode?.toLowerCase()).toBe('0x803b0013');
      });

      it('should return undefined when no error code present', () => {
        const output = ['network port error failed'];

        const error = detectHNSError(output);

        expect(error?.errorCode).toBeUndefined();
      });
    });

    describe('Pattern Priority', () => {
      it('should prioritize specific patterns over generic', () => {
        const output = [
          '[ERROR] network error - port already exists (0x803b0013)',
        ];

        const error = detectHNSError(output);

        // Should match port_conflict, not unknown
        expect(error?.type).toBe('port_conflict');
      });
    });
  });

  describe('getErrorTypeDescription', () => {
    it('should return "Port Conflict" for port_conflict type', () => {
      expect(getErrorTypeDescription('port_conflict')).toBe('Port Conflict');
    });

    it('should return "HNS Endpoint Error" for hns_endpoint type', () => {
      expect(getErrorTypeDescription('hns_endpoint')).toBe('HNS Endpoint Error');
    });

    it('should return "NAT Mapping Conflict" for nat_mapping type', () => {
      expect(getErrorTypeDescription('nat_mapping')).toBe('NAT Mapping Conflict');
    });

    it('should return "Service Failure" for service_failure type', () => {
      expect(getErrorTypeDescription('service_failure')).toBe('Service Failure');
    });

    it('should return "Network Error" for unknown type', () => {
      expect(getErrorTypeDescription('unknown')).toBe('Network Error');
    });
  });

  describe('getSeverityColor', () => {
    it('should return red color class for critical severity', () => {
      expect(getSeverityColor('critical')).toBe('text-red-400');
    });

    it('should return yellow color class for warning severity', () => {
      expect(getSeverityColor('warning')).toBe('text-yellow-400');
    });

    it('should return blue color class for info severity', () => {
      expect(getSeverityColor('info')).toBe('text-blue-400');
    });
  });

  describe('formatPorts', () => {
    it('should format single port', () => {
      expect(formatPorts([8080])).toBe('Port 8080');
    });

    it('should format multiple ports', () => {
      expect(formatPorts([8080, 8443])).toBe('Ports 8080, 8443');
    });

    it('should handle empty array', () => {
      expect(formatPorts([])).toBe('Unknown ports');
    });

    it('should handle undefined', () => {
      expect(formatPorts(undefined)).toBe('Unknown ports');
    });

    it('should format many ports correctly', () => {
      expect(formatPorts([8080, 8443, 9000, 9001])).toBe('Ports 8080, 8443, 9000, 9001');
    });
  });

  describe('RecoverySuggestion Structure', () => {
    it('should include scriptPath for automated suggestions', () => {
      const output = ['port already exists (0x803b0013)'];
      const error = detectHNSError(output);

      const automatedSuggestions = error?.suggestions.filter(s => s.automated);

      automatedSuggestions?.forEach(suggestion => {
        if (suggestion.action !== 'retry_deployment') {
          expect(suggestion.scriptPath).toBeDefined();
        }
      });
    });

    it('should have title and description for all suggestions', () => {
      const output = ['port already exists (0x803b0013)'];
      const error = detectHNSError(output);

      error?.suggestions.forEach(suggestion => {
        expect(suggestion.title).toBeDefined();
        expect(suggestion.title.length).toBeGreaterThan(0);
        expect(suggestion.description).toBeDefined();
        expect(suggestion.description.length).toBeGreaterThan(0);
      });
    });
  });
});
