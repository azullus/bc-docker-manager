import {
  BCContainer,
  PortMapping,
  ContainerStats,
  ContainerLog,
  BackupInfo,
  BackupSchedule,
  ContainerAction,
  AIMessage,
  TroubleshootingContext,
  DashboardStats,
  ApiResponse,
} from '@/lib/types';

describe('Type Definitions', () => {
  describe('BCContainer', () => {
    it('should allow valid container object', () => {
      const container: BCContainer = {
        id: 'abc123',
        name: 'bcserver-bc25',
        status: 'running',
        image: 'mcr.microsoft.com/businesscentral:latest',
        created: '2024-01-15T10:00:00Z',
        ports: [],
      };

      expect(container.id).toBe('abc123');
      expect(container.status).toBe('running');
    });

    it('should allow all valid status values', () => {
      const statuses: BCContainer['status'][] = [
        'running',
        'stopped',
        'paused',
        'restarting',
        'exited',
        'dead',
      ];

      statuses.forEach((status) => {
        const container: BCContainer = {
          id: '1',
          name: 'test',
          status,
          image: 'test',
          created: '',
          ports: [],
        };
        expect(container.status).toBe(status);
      });
    });

    it('should allow optional fields', () => {
      const container: BCContainer = {
        id: 'abc123',
        name: 'bcserver-bc25',
        status: 'running',
        image: 'mcr.microsoft.com/businesscentral:latest',
        created: '2024-01-15T10:00:00Z',
        ports: [],
        bcVersion: '25.0',
        webClientUrl: 'https://localhost/BC/',
        health: 'healthy',
        memoryUsage: '4 GB',
        cpuUsage: '10%',
        uptime: '2 days',
      };

      expect(container.bcVersion).toBe('25.0');
      expect(container.health).toBe('healthy');
    });
  });

  describe('PortMapping', () => {
    it('should allow valid port mapping', () => {
      const port: PortMapping = {
        privatePort: 8080,
        publicPort: 54525,
        type: 'tcp',
      };

      expect(port.privatePort).toBe(8080);
      expect(port.type).toBe('tcp');
    });

    it('should allow both tcp and udp types', () => {
      const tcpPort: PortMapping = {
        privatePort: 8080,
        publicPort: 8080,
        type: 'tcp',
      };

      const udpPort: PortMapping = {
        privatePort: 53,
        publicPort: 53,
        type: 'udp',
      };

      expect(tcpPort.type).toBe('tcp');
      expect(udpPort.type).toBe('udp');
    });
  });

  describe('ContainerStats', () => {
    it('should allow valid stats object', () => {
      const stats: ContainerStats = {
        cpuPercent: 12.5,
        memoryUsage: 4294967296,
        memoryLimit: 8589934592,
        memoryPercent: 50,
        networkRx: 1024000,
        networkTx: 512000,
      };

      expect(stats.cpuPercent).toBe(12.5);
      expect(stats.memoryPercent).toBe(50);
    });
  });

  describe('ContainerLog', () => {
    it('should allow valid log entry', () => {
      const log: ContainerLog = {
        timestamp: '2024-01-15T10:00:00Z',
        stream: 'stdout',
        message: 'Container started',
      };

      expect(log.stream).toBe('stdout');
    });

    it('should allow both stdout and stderr streams', () => {
      const stdout: ContainerLog = {
        timestamp: '',
        stream: 'stdout',
        message: 'info',
      };

      const stderr: ContainerLog = {
        timestamp: '',
        stream: 'stderr',
        message: 'error',
      };

      expect(stdout.stream).toBe('stdout');
      expect(stderr.stream).toBe('stderr');
    });
  });

  describe('BackupInfo', () => {
    it('should allow valid backup info', () => {
      const backup: BackupInfo = {
        id: 'backup-123',
        containerName: 'bcserver-bc25',
        fileName: 'backup-2024-01-15.bak',
        filePath: 'C:\\BCBackups\\bcserver-bc25\\backup-2024-01-15.bak',
        size: 1073741824,
        createdAt: '2024-01-15T02:00:00Z',
        status: 'completed',
      };

      expect(backup.status).toBe('completed');
    });

    it('should allow all valid status values', () => {
      const statuses: BackupInfo['status'][] = ['completed', 'in_progress', 'failed'];

      statuses.forEach((status) => {
        const backup: BackupInfo = {
          id: '1',
          containerName: 'test',
          fileName: 'test.bak',
          filePath: '/test.bak',
          size: 0,
          createdAt: '',
          status,
        };
        expect(backup.status).toBe(status);
      });
    });
  });

  describe('BackupSchedule', () => {
    it('should allow valid schedule', () => {
      const schedule: BackupSchedule = {
        containerName: 'bcserver-bc25',
        enabled: true,
        time: '02:00',
        retentionDays: 7,
        lastRun: '2024-01-14T02:00:00Z',
        nextRun: '2024-01-15T02:00:00Z',
      };

      expect(schedule.enabled).toBe(true);
      expect(schedule.retentionDays).toBe(7);
    });

    it('should allow optional run fields', () => {
      const schedule: BackupSchedule = {
        containerName: 'bcserver-bc25',
        enabled: false,
        time: '02:00',
        retentionDays: 7,
      };

      expect(schedule.lastRun).toBeUndefined();
      expect(schedule.nextRun).toBeUndefined();
    });
  });

  describe('ContainerAction', () => {
    it('should allow valid action', () => {
      const action: ContainerAction = {
        type: 'start',
        containerId: 'abc123',
        timestamp: '2024-01-15T10:00:00Z',
        status: 'success',
        message: 'Container started successfully',
      };

      expect(action.type).toBe('start');
      expect(action.status).toBe('success');
    });

    it('should allow all action types', () => {
      const types: ContainerAction['type'][] = ['start', 'stop', 'restart', 'remove', 'backup'];

      types.forEach((type) => {
        const action: ContainerAction = {
          type,
          containerId: '1',
          timestamp: '',
          status: 'pending',
        };
        expect(action.type).toBe(type);
      });
    });
  });

  describe('AIMessage', () => {
    it('should allow valid message', () => {
      const message: AIMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'How do I start a container?',
        timestamp: '2024-01-15T10:00:00Z',
      };

      expect(message.role).toBe('user');
    });

    it('should allow both user and assistant roles', () => {
      const userMessage: AIMessage = {
        id: '1',
        role: 'user',
        content: 'question',
        timestamp: '',
      };

      const assistantMessage: AIMessage = {
        id: '2',
        role: 'assistant',
        content: 'answer',
        timestamp: '',
      };

      expect(userMessage.role).toBe('user');
      expect(assistantMessage.role).toBe('assistant');
    });
  });

  describe('TroubleshootingContext', () => {
    it('should allow empty context', () => {
      const context: TroubleshootingContext = {};
      expect(context).toBeDefined();
    });

    it('should allow partial context', () => {
      const context: TroubleshootingContext = {
        containerName: 'bcserver-bc25',
      };
      expect(context.containerName).toBe('bcserver-bc25');
    });

    it('should allow full context', () => {
      const context: TroubleshootingContext = {
        containerName: 'bcserver-bc25',
        errorLog: 'Error: Something went wrong',
        action: 'start',
      };
      expect(context.errorLog).toBeDefined();
    });
  });

  describe('DashboardStats', () => {
    it('should allow valid stats', () => {
      const stats: DashboardStats = {
        totalContainers: 5,
        runningContainers: 3,
        stoppedContainers: 2,
        totalBackups: 15,
        lastBackupDate: '2024-01-15T02:00:00Z',
        healthyContainers: 3,
        unhealthyContainers: 0,
      };

      expect(stats.totalContainers).toBe(5);
      expect(stats.runningContainers + stats.stoppedContainers).toBe(stats.totalContainers);
    });
  });

  describe('ApiResponse', () => {
    it('should allow success response', () => {
      const response: ApiResponse<BCContainer[]> = {
        success: true,
        data: [],
      };
      expect(response.success).toBe(true);
    });

    it('should allow error response', () => {
      const response: ApiResponse<BCContainer[]> = {
        success: false,
        error: 'Failed to fetch containers',
      };
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should work with different data types', () => {
      const containerResponse: ApiResponse<BCContainer> = {
        success: true,
        data: {
          id: '1',
          name: 'test',
          status: 'running',
          image: 'test',
          created: '',
          ports: [],
        },
      };

      const backupResponse: ApiResponse<BackupInfo[]> = {
        success: true,
        data: [],
      };

      const messageResponse: ApiResponse<string> = {
        success: true,
        data: 'OK',
      };

      expect(containerResponse.success).toBe(true);
      expect(backupResponse.success).toBe(true);
      expect(messageResponse.success).toBe(true);
    });
  });
});
